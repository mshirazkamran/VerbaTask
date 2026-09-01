import Merchant from '../models/Merchant.js';
import InventoryItem from '../models/InventoryItem.js';
import ConversationState from '../models/ConversationState.js';

import { createOrder } from '../crm/order.service.js';
import { evaluateMessageWorkflows, createWorkflow } from '../workflows/workflow.service.js';
import { respond as respondToApproval, findPendingByOrderId } from '../approvals/approval.service.js';
import { generateLinkCode } from './auth.controller.js';
import { parseIntent, extractBusinessDetails, extractInventoryItems } from '../services/qwen.service.js';
import { transcribeAndParse } from '../agent/transcribeAndParse.js';
import { downloadMedia } from '../services/media.service.js';
import {
  sendTextMessage as sendTextMessageRaw,
  sendInteractiveButtons as sendInteractiveButtonsRaw,
  sendInteractiveList as sendInteractiveListRaw,
  paginateRows,
} from '../services/whatsapp.service.js';

/**
 * WhatsApp webhook controller — routes every inbound message to the right
 * flow: registration (unknown number), onboarding, or the main command
 * router for onboarded merchants. Acknowledges Meta immediately and does
 * all real work after, so slow AI calls never trigger Meta's retry storm.
 */
const SIGNUP_BASE_URL = process.env.SIGNUP_BASE_URL || 'http://localhost:3000/signup';

/**
 * Safe WhatsApp reply helper — never lets a failed outbound send crash the
 * webhook handler. Logs the failure so we still know something went wrong.
 */
async function sendTextMessage(to, text) {
  try {
    return await sendTextMessageRaw(to, text);
  } catch (err) {
    console.error('sendTextMessage failed:', err.message);
  }
}

async function sendInteractiveButtons(to, body, buttons) {
  try {
    return await sendInteractiveButtonsRaw(to, body, buttons);
  } catch (err) {
    console.error('sendInteractiveButtons failed:', err.message);
  }
}

async function sendInteractiveList(to, body, buttonText, sections) {
  try {
    return await sendInteractiveListRaw(to, body, buttonText, sections);
  } catch (err) {
    console.error('sendInteractiveList failed:', err.message);
  }
}

function friendlyFallback() {
  return "Sorry, something went wrong on my end. Please try again in a moment, or use the dashboard.";
}

/** Meta's one-time webhook verification handshake (GET /webhook/whatsapp). */
export function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (
    mode === 'subscribe' &&
    process.env.WHATSAPP_VERIFY_TOKEN &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

// ---------------------------------------------------------------------------
// Idempotency — Meta can and does redeliver the same webhook event on a slow
// or non-200 response. An in-memory FIFO is enough for a hackathon prototype;
// swap for a Mongo collection with a TTL index if this needs to survive a
// server restart.
// ---------------------------------------------------------------------------
const seenMessageIds = new Set();
function alreadyProcessed(id) {
  if (seenMessageIds.has(id)) return true;
  seenMessageIds.add(id);
  // Trim oldest first (Sets iterate in insertion order) — clearing wholesale
  // would briefly allow redelivered recent messages to be processed twice.
  if (seenMessageIds.size > 1000) {
    seenMessageIds.delete(seenMessageIds.values().next().value);
  }
  return false;
}

/** Entry point for every inbound event (POST /webhook/whatsapp). */
export async function handleIncomingMessage(req, res) {
  // Always ack fast — Meta retries aggressively on non-200/timeout, and a
  // retry storm on top of a slow Qwen call is worse than an occasional
  // dropped event for a prototype.
  res.sendStatus(200);

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (!message) return; // status/delivery updates land here too — nothing to do

    if (alreadyProcessed(message.id)) return;

    const from = message.from; // WhatsApp number, no '+' prefix
    const merchant = await Merchant.findOne({ whatsappNumber: from });

    // `return await` throughout — a bare `return promise()` would let a
    // rejection skip this catch entirely and surface as an unhandled
    // rejection (which kills the Node process by default).
    if (!merchant) return await handleUnregisteredNumber(from);
    if (!merchant.onboardingComplete) return await handleOnboarding(merchant, message);
    return await handleOnboardedMerchant(merchant, message);
  } catch (err) {
    console.error('handleIncomingMessage error:', err);
  }
}

/**
 * Unknown number → send the signup link plus a fresh linking code the web
 * signup flow will ask for. generateLinkCode (auth module) reuses an
 * unexpired, unused code rather than issuing a new one on every message.
 */
async function handleUnregisteredNumber(whatsappNumber) {
  const linkCode = await generateLinkCode(whatsappNumber);

  await sendTextMessage(
    whatsappNumber,
    `Welcome to VerbaTask! 👋\n\nTo get started, create your account here:\n${SIGNUP_BASE_URL}\n\nYour linking code: *${linkCode.code}*\n(valid for 15 minutes)`
  );
}

async function sendLinkCodeToMerchant(merchant) {
  const linkCode = await generateLinkCode(merchant.whatsappNumber);

  await sendTextMessage(
    merchant.whatsappNumber,
    `Your VerbaTask linking code: *${linkCode.code}*\n(valid for 15 minutes)\n\nEnter it on the Link Code page to connect this number to your dashboard account.`
  );
}

/**
 * Onboarding conversation: language → business details → initial stock.
 * Progress persists in ConversationState between messages and is deleted
 * once onboardingComplete is set on the merchant.
 */
async function handleOnboarding(merchant, message) {
  let state = await ConversationState.findOne({ whatsappNumber: merchant.whatsappNumber });
  if (!state) {
    state = await ConversationState.create({
      whatsappNumber: merchant.whatsappNumber,
      merchantId: merchant._id,
      flow: 'onboarding',
      step: 'awaiting_language',
    });
    return sendInteractiveButtons(merchant.whatsappNumber, 'Please choose your language:', [
      { id: 'lang_ur', title: 'اردو' },
      { id: 'lang_en', title: 'English' },
    ]);
  }

  const replyId = message.interactive?.button_reply?.id;
  const text = message.text?.body?.trim();

  // Allow users to request a dashboard link code at any point during onboarding.
  if (text && (text.toLowerCase() === 'link' || text.toLowerCase() === 'code')) {
    return sendLinkCodeToMerchant(merchant);
  }

  switch (state.step) {
    case 'awaiting_language': {
      const language = replyId === 'lang_en' ? 'en' : 'ur';
      merchant.language = language;
      await merchant.save();
      state.step = 'awaiting_business_details';
      await state.save();
      return sendTextMessage(
        merchant.whatsappNumber,
        language === 'ur'
          ? 'Business ka naam, location, aur aap kya bechte hain, ek message mein bata dein.'
          : 'Tell me your business name, location, and what you sell — all in one message is fine.'
      );
    }

    case 'awaiting_business_details': {
      if (!text) return sendTextMessage(merchant.whatsappNumber, 'Please send this as text.');
      // Qwen extracts name/location/sells; if it can't (no key, timeout,
      // garbage JSON) keep the raw text on businessName so onboarding never
      // blocks on a flaky NLP call.
      const details = await extractBusinessDetails(text);
      merchant.businessName = details?.businessName || text;
      if (details?.location) merchant.location = details.location;
      if (details?.sells) merchant.sells = details.sells;
      await merchant.save();
      state.step = 'awaiting_inventory';
      await state.save();
      return sendTextMessage(
        merchant.whatsappNumber,
        'Got it. Now list your starting stock (item, quantity, price) — or reply "skip" to add it later from the dashboard.'
      );
    }

    case 'awaiting_inventory': {
      if (!text) return sendTextMessage(merchant.whatsappNumber, 'Please send your stock list as text.');
      let addedCount = 0;
      if (text.toLowerCase() !== 'skip') {
        // Qwen parses the free-form list into real line items; when it can't,
        // store the raw text as a single unparsed item (the old behaviour)
        // rather than losing the merchant's input.
        const items = await extractInventoryItems(text);
        if (items?.length) {
          await InventoryItem.insertMany(
            items.map((i) => ({
              merchantId: merchant._id,
              name: i.name,
              quantity: i.quantity,
              ...(i.price != null && { price: i.price }),
              ...(i.unit && { unit: i.unit }),
            }))
          );
          addedCount = items.length;
        } else {
          await InventoryItem.create({ merchantId: merchant._id, name: text, quantity: 0 });
        }
      }
      merchant.onboardingComplete = true;
      await merchant.save();
      await ConversationState.deleteOne({ _id: state._id });
      return sendTextMessage(
        merchant.whatsappNumber,
        addedCount > 0
          ? `You're all set! I added ${addedCount} item${addedCount === 1 ? '' : 's'} to your stock. Message me anytime to log a sale or create an automation.`
          : "You're all set! Message me anytime to log a sale or create an automation."
      );
    }

    default:
      // Corrupted/unexpected state — reset rather than get stuck.
      await ConversationState.deleteOne({ _id: state._id });
      return handleOnboarding(merchant, message);
  }
}

/**
 * Fully onboarded merchant — resumes an in-flight guided order, otherwise
 * routes by message type: text (NLP/command), interactive (menu), audio
 * (voice-note pipeline), image (OCR placeholder).
 */
async function handleOnboardedMerchant(merchant, message) {
  try {
    // Check approval button taps first — before the guided-order state check so
    // an approve/reject tap mid-guided-order isn't swallowed by that flow.
    if (message.type === 'interactive') {
      const buttonId = message.interactive?.button_reply?.id;
      if (buttonId?.startsWith('approve_') || buttonId?.startsWith('reject_')) {
        return await handleApprovalReply(merchant, buttonId);
      }
    }

    const existingState = await ConversationState.findOne({
      whatsappNumber: merchant.whatsappNumber,
      flow: 'guided_order',
    });
    if (existingState) {
      // An abandoned guided order used to swallow EVERY subsequent message
      // forever (nothing ever reached the workflows or NLP again). Expire it
      // after 30 idle minutes and fall through to normal routing instead.
      const idleMs = Date.now() - new Date(existingState.updatedAt).getTime();
      if (idleMs > 30 * 60 * 1000) {
        await ConversationState.deleteOne({ _id: existingState._id });
      } else {
        return await continueGuidedOrder(merchant, message, existingState);
      }
    }

    if (message.type === 'text') {
      return await handleTextMessage(merchant, message.text.body);
    }

    if (message.type === 'interactive') {
      const listId = message.interactive?.list_reply?.id;
      if (listId === 'start_guided_order') return await startGuidedOrder(merchant);
      return sendTextMessage(merchant.whatsappNumber, "Sorry, I didn't expect that reply — try again?");
    }

    if (message.type === 'audio') {
      return await handleVoiceNote(merchant, message.audio.id);
    }

    if (message.type === 'image') {
      // Optional OCR path — not the primary flow. Ack for now.
      return sendTextMessage(
        merchant.whatsappNumber,
        "Got your image — screenshot reconciliation isn't wired up yet, log this sale manually for now."
      );
    }

    return sendTextMessage(merchant.whatsappNumber, "I can't handle that message type yet.");
  } catch (err) {
    console.error('handleOnboardedMerchant error:', err);
    return sendTextMessage(merchant.whatsappNumber, friendlyFallback(err));
  }
}

/** Typed text: "order" starts the guided flow, "link"/"code" resends the dashboard linking code, message workflows are checked next, anything else goes through Qwen NLP. */
async function handleTextMessage(merchant, text) {
  const normalized = text.trim().toLowerCase();

  if (/^(order|sale|log)$/i.test(normalized)) return startGuidedOrder(merchant);
  if (normalized === 'link' || normalized === 'code') return sendLinkCodeToMerchant(merchant);

  // Check stored message workflows first — if any fire, skip NLP entirely
  try {
    const triggered = await evaluateMessageWorkflows(merchant._id, text);
    if (triggered.length > 0) return; // workflow(s) already replied to the merchant
  } catch (err) {
    console.error('evaluateMessageWorkflows error:', err.message);
  }

  try {
    const intent = await parseIntent(text);
    return await routeParsedCommand(merchant, intent, 'voice' /* typed text uses the same NLP path */);
  } catch (err) {
    console.error('parseIntent failed:', err.message);
    return sendTextMessage(
      merchant.whatsappNumber,
      "I didn't quite catch that — try 'order' to log a sale, or describe an automation you'd like."
    );
  }
}

/** Voice note: download audio, transcribe + parse via agent/, then run the command. */
async function handleVoiceNote(merchant, mediaId) {
  try {
    const { buffer, mimeType } = await downloadMedia(mediaId);
    const intent = await transcribeAndParse(buffer, mimeType, merchant.language);
    return routeParsedCommand(merchant, intent, 'voice');
  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data ? JSON.stringify(err.response.data) : '';
    console.error(
      `voice note handling failed for ${merchant.whatsappNumber}: ${err.message}${status ? ` (status ${status})` : ''}${body ? ` ${body}` : ''}`
    );
    return sendTextMessage(merchant.whatsappNumber, "Couldn't process that voice note — try typing it instead.");
  }
}

/**
 * Runs one parsed Qwen command. Both input paths (typed text and voice)
 * converge here on the identical structured command shape, so downstream
 * handling never knows which path produced it (per the architecture guide).
 */
async function routeParsedCommand(merchant, intent, source) {
  if (intent.type === 'log_sale') {
    return createOrderViaCrm(merchant, {
      type: 'log_sale',
      merchantId: merchant._id,
      item: intent.item,
      paymentMethod: intent.paymentMethod,
      amount: intent.amount,
      source,
    });
  }

  if (intent.type === 'create_workflow') {
    return createWorkflowViaModule(merchant, {
      merchantId: merchant._id,
      trigger: intent.trigger,
      condition: intent.condition,
      action: intent.action,
      rawInstruction: intent.rawInstruction,
      source,
    });
  }

  return sendTextMessage(
    merchant.whatsappNumber,
    "I didn't quite catch that — try 'order' to log a sale, or describe an automation you'd like."
  );
}

// ---------------------------------------------------------------------------
// Guided order flow: item picker → quantity → payment method → confirm
// ---------------------------------------------------------------------------
/** Starts the guided flow: saves state and sends the first item-picker page. */
async function startGuidedOrder(merchant) {
  const itemCount = await InventoryItem.countDocuments({ merchantId: merchant._id });
  if (!itemCount) {
    return sendTextMessage(
      merchant.whatsappNumber,
      'Your stock list is empty — add items from the dashboard first, or just tell me the sale directly (e.g. "2 rice bags, cash, 1500").'
    );
  }

  await ConversationState.findOneAndUpdate(
    { whatsappNumber: merchant.whatsappNumber },
    { merchantId: merchant._id, flow: 'guided_order', step: 'awaiting_item', data: { page: 0 } },
    { upsert: true }
  );

  return sendItemPickerPage(merchant, 0);
}

/**
 * Sends one page of the item picker. paginateRows pages at 9 rows so every
 * page but the last has room for a "Show more" row inside WhatsApp's 10-row
 * list cap; the current page rides along in ConversationState.data.
 */
async function sendItemPickerPage(merchant, page) {
  const items = await InventoryItem.find({ merchantId: merchant._id }).limit(50);
  const rows = items.map((i) => ({ id: `item_${i._id}`, title: i.name.slice(0, 24) }));
  const pages = paginateRows(rows);
  const safePage = Math.max(0, Math.min(page, pages.length - 1));
  const hasMore = safePage < pages.length - 1;

  return sendInteractiveList(merchant.whatsappNumber, 'What did you sell?', 'Pick item', [
    {
      title: 'Your stock',
      rows: hasMore ? [...pages[safePage], { id: 'show_more', title: 'Show more' }] : pages[safePage],
    },
  ]);
}

/** Advances an in-flight guided order one step, driven by ConversationState.step. */
async function continueGuidedOrder(merchant, message, state) {
  const listId = message.interactive?.list_reply?.id;
  const buttonId = message.interactive?.button_reply?.id;

  // Escape hatch — typing "cancel"/"stop" abandons the in-flight order instead
  // of trapping the merchant in the flow (complements the 30-min idle expiry).
  const typed = message.text?.body?.trim().toLowerCase();
  if (typed === 'cancel' || typed === 'stop') {
    await ConversationState.deleteOne({ _id: state._id });
    return sendTextMessage(
      merchant.whatsappNumber,
      'No problem — order cancelled. Send "order" whenever you want to log another sale.'
    );
  }

  switch (state.step) {
    case 'awaiting_item': {
      if (listId === 'show_more') {
        const nextPage = (state.data?.page ?? 0) + 1;
        state.data = { ...state.data, page: nextPage };
        await state.save();
        return sendItemPickerPage(merchant, nextPage);
      }
      if (!listId?.startsWith('item_')) {
        return sendTextMessage(merchant.whatsappNumber, 'Please pick an item from the list.');
      }
      const item = await InventoryItem.findById(listId.replace('item_', ''));
      if (!item) return sendTextMessage(merchant.whatsappNumber, "Couldn't find that item — try again.");

      state.data = {
        ...state.data,
        itemId: item._id.toString(),
        itemName: item.name,
        price: item.price, // stashed so finalize can compute the total without a re-fetch
      };
      state.step = 'awaiting_quantity';
      await state.save();
      return sendTextMessage(merchant.whatsappNumber, `How many ${item.name} did you sell?`);
    }

    case 'awaiting_quantity': {
      const quantity = parseInt(message.text?.body, 10);
      if (!quantity || quantity <= 0) {
        return sendTextMessage(merchant.whatsappNumber, 'Please send a valid number.');
      }
      state.data = { ...state.data, quantity };
      state.step = 'awaiting_payment_method';
      await state.save();
      return sendInteractiveButtons(merchant.whatsappNumber, 'How was it paid?', [
        { id: 'pay_cash', title: 'Cash' },
        { id: 'pay_easypaisa', title: 'EasyPaisa' },
        { id: 'pay_jazzcash', title: 'JazzCash' },
      ]);
      // Note: WhatsApp caps reply buttons at 3 — "bank" is offered as a
      // follow-up text option below rather than a 4th button.
    }

    case 'awaiting_payment_method': {
      const map = { pay_cash: 'cash', pay_easypaisa: 'easypaisa', pay_jazzcash: 'jazzcash' };
      // "bank" can't be a 4th reply button (WhatsApp caps at 3), so the prompt
      // offers it as typed text instead — honour that here.
      const typed = message.text?.body?.trim().toLowerCase();
      const paymentMethod = map[buttonId] || (typed === 'bank' ? 'bank' : null);
      if (!paymentMethod) {
        return sendTextMessage(
          merchant.whatsappNumber,
          'Tap one of the buttons, or type "bank" if it was a bank transfer.'
        );
      }
      state.data = { ...state.data, paymentMethod };
      await state.save();
      return finalizeGuidedOrder(merchant, state);
    }

    default: {
      await ConversationState.deleteOne({ _id: state._id });
      return sendTextMessage(merchant.whatsappNumber, 'Something went wrong — let\'s start over. Type "order" to try again.');
    }
  }
}

/** Logs the completed guided order via crm/ and clears the flow state. */
async function finalizeGuidedOrder(merchant, state) {
  const { itemId, itemName, quantity, paymentMethod, price } = state.data;

  await createOrderViaCrm(merchant, {
    type: 'log_sale',
    merchantId: merchant._id,
    item: { name: itemName, quantity, inventoryItemId: itemId },
    paymentMethod,
    // Guided flow never asks for a price — derive it from the stock list's
    // unit price; null if the merchant never set one.
    amount: price != null ? price * quantity : null,
    source: 'guided',
  });

  await ConversationState.deleteOne({ _id: state._id });
}

// ---------------------------------------------------------------------------
// crm / workflows / approvals integration — call these as direct module
// imports, never via the HTTP routes (per the backend contract).
// ---------------------------------------------------------------------------
/**
 * Runs one log_sale command through crm/order.service.js and replies to the
 * merchant. Business failures arrive as Error messages prefixed
 * ITEM_NOT_FOUND: / INSUFFICIENT_STOCK: and get a helpful reply; anything
 * unexpected gets a generic apology.
 */
async function createOrderViaCrm(merchant, command) {
  try {
    const order = await createOrder(command);
    const orderNo = order?._id ? order._id.toString().slice(-6) : '';
    return sendTextMessage(
      merchant.whatsappNumber,
      `✅ Logged: ${command.item.quantity} x ${command.item.name} (${command.paymentMethod})${orderNo ? ` — Order #${orderNo}` : ''}.`
    );
  } catch (err) {
    const message = err?.message ?? '';

    if (message.startsWith('ITEM_NOT_FOUND:')) {
      return sendTextMessage(
        merchant.whatsappNumber,
        `I couldn't find "${command.item.name}" in your stock — add it from the dashboard first, or check the spelling.`
      );
    }

    if (message.startsWith('INSUFFICIENT_STOCK:')) {
      const detail = message.slice('INSUFFICIENT_STOCK:'.length).trim();
      return sendTextMessage(
        merchant.whatsappNumber,
        `Not enough stock for that sale${detail ? ` — ${detail}` : ''}.`
      );
    }

    console.error('createOrder failed:', message);
    return sendTextMessage(
      merchant.whatsappNumber,
      "Sorry — I couldn't log that sale. Please try again in a moment."
    );
  }
}

/** Creates an automation through workflows/createWorkflow and confirms back to the merchant. */
async function createWorkflowViaModule(merchant, command) {
  try {
    const workflow = await createWorkflow(command);
    return sendTextMessage(
      merchant.whatsappNumber,
      `✅ Automation created: "${workflow.rawInstruction}". I'll take it from here.`
    );
  } catch (err) {
    console.error('createWorkflow failed:', err.message);
    return sendTextMessage(
      merchant.whatsappNumber,
      "Sorry — I couldn't create that automation. Please try again, or set it up from the dashboard."
    );
  }
}

/**
 * Handles approve_<orderId> / reject_<orderId> button replies.
 * Looks up the pending Approval by orderId (Ali's button ID convention), calls
 * respond(), and confirms back to the merchant. respond() owns the order status
 * update — nothing else needed here.
 */
async function handleApprovalReply(merchant, buttonId) {
  const isApprove = buttonId.startsWith('approve_');
  const orderId = buttonId.replace(/^(approve|reject)_/, '');
  const decision = isApprove ? 'approved' : 'rejected';

  try {
    const approval = await findPendingByOrderId(orderId);

    if (!approval) {
      return sendTextMessage(merchant.whatsappNumber, "That order has already been handled.");
    }

    await respondToApproval(approval._id, decision);

    return sendTextMessage(
      merchant.whatsappNumber,
      isApprove
        ? `✅ Order approved and marked as completed.`
        : `❌ Order rejected. Stock has been restored.`
    );
  } catch (err) {
    if (err.message?.startsWith('APPROVAL_NOT_FOUND')) {
      return sendTextMessage(merchant.whatsappNumber, "That order has already been handled.");
    }
    console.error('handleApprovalReply failed:', err.message);
    return sendTextMessage(merchant.whatsappNumber, "Couldn't process that — please try from the dashboard.");
  }
}
