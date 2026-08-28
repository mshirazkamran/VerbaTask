import crypto from 'crypto';

import Merchant from '../models/merchant.model.js';
import LinkCode from '../models/linkCode.model.js';
import InventoryItem from '../models/inventoryItem.model.js';
import ConversationState from '../models/conversationState.model.js';

import { parseIntent } from '../services/qwen.service.js';
import { downloadMedia } from '../services/media.service.js';
import {
  sendTextMessage,
  sendInteractiveButtons,
  sendInteractiveList,
  paginateRows,
} from '../services/whatsapp.service.js';

/**
 * WhatsApp webhook controller — routes every inbound message to the right
 * flow: registration (unknown number), onboarding, or the main command
 * router for onboarded merchants. Acknowledges Meta immediately and does
 * all real work after, so slow AI calls never trigger Meta's retry storm.
 */
const SIGNUP_BASE_URL = process.env.SIGNUP_BASE_URL || 'http://localhost:3000/signup';

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
 * signup flow will ask for. Reuses an unexpired, unused code if one exists
 * rather than issuing a new one on every message.
 */
async function handleUnregisteredNumber(whatsappNumber) {
  let linkCode = await LinkCode.findOne({
    whatsappNumber,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!linkCode) {
    const code = crypto.randomInt(100000, 999999).toString();
    linkCode = await LinkCode.create({
      whatsappNumber,
      code,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
  }

  await sendTextMessage(
    whatsappNumber,
    `Welcome to VerbaTask! 👋\n\nTo get started, create your account here:\n${SIGNUP_BASE_URL}\n\nYour linking code: *${linkCode.code}*\n(valid for 15 minutes)`
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
      // TODO: swap this for a Qwen extraction call once agent/ exists — plain
      // storage of the raw text is enough to unblock testing tonight.
      merchant.businessName = text;
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
      if (text.toLowerCase() !== 'skip') {
        // TODO: real parsing belongs in crm/ — placeholder single-item log so
        // the flow is testable end-to-end tonight.
        await InventoryItem.create({ merchantId: merchant._id, name: text, quantity: 0 });
      }
      merchant.onboardingComplete = true;
      await merchant.save();
      await ConversationState.deleteOne({ _id: state._id });
      return sendTextMessage(
        merchant.whatsappNumber,
        "You're all set! Message me anytime to log a sale or create an automation."
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
  const existingState = await ConversationState.findOne({
    whatsappNumber: merchant.whatsappNumber,
    flow: 'guided_order',
  });
  if (existingState) return continueGuidedOrder(merchant, message, existingState);

  if (message.type === 'text') {
    return handleTextMessage(merchant, message.text.body);
  }

  if (message.type === 'interactive') {
    const listId = message.interactive?.list_reply?.id;
    if (listId === 'start_guided_order') return startGuidedOrder(merchant);
    return sendTextMessage(merchant.whatsappNumber, "Sorry, I didn't expect that reply — try again?");
  }

  if (message.type === 'audio') {
    return handleVoiceNote(merchant, message.audio.id);
  }

  if (message.type === 'image') {
    // Optional OCR path — not the primary flow. Ack for now.
    return sendTextMessage(
      merchant.whatsappNumber,
      "Got your image — screenshot reconciliation isn't wired up yet, log this sale manually for now."
    );
  }

  return sendTextMessage(merchant.whatsappNumber, "I can't handle that message type yet.");
}

/** Typed text: "order" starts the guided flow, anything else goes through Qwen NLP. */
async function handleTextMessage(merchant, text) {
  if (/^(order|sale|log)$/i.test(text.trim())) return startGuidedOrder(merchant);

  const intent = await parseIntent(text);
  return routeParsedCommand(merchant, intent, 'voice' /* typed text uses the same NLP path */);
}

/** Voice note: download audio, transcribe + parse via agent/, then run the command. */
async function handleVoiceNote(merchant, mediaId) {
  try {
    const { buffer, mimeType } = await downloadMedia(mediaId);
    // TODO: agent/ owns transcription — this dynamic import lets the
    // WhatsApp layer work tonight even before that module exists, and fails
    // gracefully instead of crashing the server on a missing file.
    const agent = await import('../agent/transcribeAndParse.js').catch(() => null);
    if (!agent) {
      return sendTextMessage(
        merchant.whatsappNumber,
        'Got your voice note — voice processing is still being built, please type it instead for now.'
      );
    }
    const intent = await agent.transcribeAndParse(buffer, mimeType);
    return routeParsedCommand(merchant, intent, 'voice');
  } catch (err) {
    console.error('voice note handling failed:', err);
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
/** Starts the guided flow: saves state and sends the item picker list. */
async function startGuidedOrder(merchant) {
  const items = await InventoryItem.find({ merchantId: merchant._id }).limit(50);
  if (!items.length) {
    return sendTextMessage(
      merchant.whatsappNumber,
      'Your stock list is empty — add items from the dashboard first, or just tell me the sale directly (e.g. "2 rice bags, cash, 1500").'
    );
  }

  const rows = items.map((i) => ({ id: `item_${i._id}`, title: i.name.slice(0, 24) }));
  const [firstPage] = paginateRows(rows); // TODO: wire "Show more" for stock lists over 9 items

  await ConversationState.findOneAndUpdate(
    { whatsappNumber: merchant.whatsappNumber },
    { merchantId: merchant._id, flow: 'guided_order', step: 'awaiting_item', data: {} },
    { upsert: true }
  );

  return sendInteractiveList(merchant.whatsappNumber, 'What did you sell?', 'Pick item', [
    { title: 'Your stock', rows: firstPage },
  ]);
}

/** Advances an in-flight guided order one step, driven by ConversationState.step. */
async function continueGuidedOrder(merchant, message, state) {
  const listId = message.interactive?.list_reply?.id;
  const buttonId = message.interactive?.button_reply?.id;

  switch (state.step) {
    case 'awaiting_item': {
      if (!listId?.startsWith('item_')) {
        return sendTextMessage(merchant.whatsappNumber, 'Please pick an item from the list.');
      }
      const item = await InventoryItem.findById(listId.replace('item_', ''));
      if (!item) return sendTextMessage(merchant.whatsappNumber, "Couldn't find that item — try again.");

      state.data = { ...state.data, itemId: item._id.toString(), itemName: item.name };
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
  const { itemId, itemName, quantity, paymentMethod } = state.data;

  await createOrderViaCrm(merchant, {
    merchantId: merchant._id,
    item: { name: itemName, quantity, inventoryItemId: itemId },
    paymentMethod,
    amount: null, // guided flow doesn't collect price explicitly — crm looks it up from stock
    source: 'guided',
  });

  await ConversationState.deleteOne({ _id: state._id });
}

// ---------------------------------------------------------------------------
// crm / workflows integration — dynamic import so the WhatsApp layer works
// standalone even before those modules land. Ali: this is the exact call
// shape createOrder() and createWorkflow() need to support per the command
// contract in the design guide — align the export names to match.
// ---------------------------------------------------------------------------
/** Creates an order through crm/createOrder; tells the merchant if the module isn't wired yet. */
async function createOrderViaCrm(merchant, command) {
  try {
    const { createOrder } = await import('../crm/createOrder.js');
    const order = await createOrder(command);
    return sendTextMessage(
      merchant.whatsappNumber,
      `✅ Logged: ${command.item.quantity} x ${command.item.name} (${command.paymentMethod}). Order #${order._id.toString().slice(-6)}.`
    );
  } catch (err) {
    console.error('createOrder unavailable or failed:', err.message);
    return sendTextMessage(
      merchant.whatsappNumber,
      `Got it: ${command.item.quantity} x ${command.item.name} via ${command.paymentMethod}. (Saving to your records is still being wired up — this isn't in your stock yet.)`
    );
  }
}

/** Creates an automation through workflows/createWorkflow; acknowledges if not wired yet. */
async function createWorkflowViaModule(merchant, command) {
  try {
    const { createWorkflow } = await import('../workflows/createWorkflow.js');
    const workflow = await createWorkflow(command);
    return sendTextMessage(
      merchant.whatsappNumber,
      `✅ Automation created: "${workflow.rawInstruction}". I'll take it from here.`
    );
  } catch (err) {
    console.error('createWorkflow unavailable or failed:', err.message);
    return sendTextMessage(
      merchant.whatsappNumber,
      `Got it — automation noted: "${command.rawInstruction}". (Activating it is still being wired up.)`
    );
  }
}
