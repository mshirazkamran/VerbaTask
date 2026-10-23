import Merchant from '../models/Merchant.js';
import InventoryItem from '../models/InventoryItem.js';
import ConversationState from '../models/ConversationState.js';
import Workflow from '../models/Workflow.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import PasswordResetCode from '../models/PasswordResetCode.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

import { createOrder } from '../crm/order.service.js';
import { processOrderReturn, processOrderExchange, findOrderByReference } from '../crm/return.service.js';
import { restockItemViaCrm, checkStockViaCrm, getStockListSummary, updateItemPriceViaCrm } from '../crm/inventory.service.js';
import { evaluateMessageWorkflows, prepareWorkflow, createWorkflow, WorkflowValidationError } from '../workflows/workflow.service.js';
import { describeWorkflow, explainWorkflowError, capabilitiesText } from '../workflows/workflow.rules.js';
import { respond as respondToApproval, findPendingByOrderId } from '../approvals/approval.service.js';
import { generateLinkCode } from './auth.controller.js';
import { getStaffLimit, normalizePhone } from './merchant.controller.js';
import { emitDashboardUpdate } from '../socket.js';
import { parseIntent, extractBusinessDetails, extractInventoryItems, resolveItemName, parseKhataSettleHeuristic, parseKhataInquiryHeuristic, parseKhataCreateHeuristic, parseKhataReportHeuristic, normalizePkMobile, parsePriceAndUnit } from '../services/qwen.service.js';
import { findSimilarInventoryItems, cleanAndStandardizeItemName } from '../crm/item-matching.js';
import { transcribeAndParse } from '../agent/transcribeAndParse.js';
import { downloadMedia } from '../services/media.service.js';
import { invalidateMerchantCatalog } from '../services/catalogCache.service.js';
import { deliverReport, deliverKhataReport } from '../services/reportDelivery.service.js';
import { recordKhataPayment } from '../services/khata.service.js';
import {
  sendTextMessage as sendTextMessageRaw,
  sendInteractiveButtons as sendInteractiveButtonsRaw,
  sendInteractiveList as sendInteractiveListRaw,
  sendVoiceReply as sendVoiceReplyRaw,
  paginateRows,
} from '../services/whatsapp.service.js';
import { spokenPhrases, formatPaymentMethod } from '../services/localization.service.js';
import {
  getAllPaymentMethods,
  isValidPaymentMethod,
  getPaymentMethodDetails,
  normalizePaymentMethod,
  DEFAULT_ACCEPTED_PAYMENT_METHODS,
} from '../constants/paymentMethods.js';

/**
 * WhatsApp webhook controller — routes every inbound message to the right
 * flow: registration (unknown number), onboarding, or the main command
 * router for onboarded merchants. Acknowledges Meta immediately and does
 * all real work after, so slow AI calls never trigger Meta's retry storm.
 */
const SIGNUP_BASE_URL = process.env.SIGNUP_BASE_URL || 'https://verba-task.netlify.app/signup';

/**
 * Resolves the phone number of the person who actually sent the message.
 * For assistants/staff, returns the assistant's phone number.
 * For store owners, returns the owner's phone number.
 */
function getSenderRecipient(merchant) {
  return merchant?._replyToNumber || merchant?.whatsappNumber;
}

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

async function sendVoiceReply(to, options) {
  try {
    return await sendVoiceReplyRaw(to, options);
  } catch (err) {
    console.error('sendVoiceReply failed:', err.message);
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

/**
 * Determines whether the bot should reply with a spoken voice note.
 * Respects merchant preferences (replyPreference) and environment configuration.
 */
function shouldReplyWithVoice(merchant, source) {
  if (!merchant || merchant.voiceReplies === false) return false;
  const pref = merchant.replyPreference || 'voice_on_voice';
  if (pref === 'text_only') return false;
  if (pref === 'always_voice') return true;
  if (pref === 'voice_on_voice') {
    return source === 'audio' || source === 'voice';
  }
  return false;
}

let _sendVoiceReply = sendVoiceReply;
let _sendTextMessage = sendTextMessage;

export function __setTestSender(mockVoice, mockText) {
  _sendVoiceReply = mockVoice || sendVoiceReply;
  _sendTextMessage = mockText || sendTextMessage;
}

/**
 * Smart bilingual reply helper — sends a spoken voice note if voice was used,
 * or text message if text was used.
 */
async function replyToMerchant(merchant, phrases, source = 'text', languageOverride = null) {
  const recipient = merchant?._replyToNumber || merchant?.whatsappNumber;
  const language = languageOverride || merchant?.language || 'ur';
  let spokenText = typeof phrases === 'string' ? phrases : phrases?.spoken || phrases?.text;
  let textReceipt = typeof phrases === 'string' ? phrases : phrases?.text;

  // If order was logged by a staff member, append staff tag
  if (merchant?._staffMember && textReceipt && (textReceipt.includes('✅') || textReceipt.includes('آرڈر #') || textReceipt.includes('Order #'))) {
    textReceipt += `\n\n👤 *Salesperson:* ${merchant._staffMember.name}`;
  }

  if (shouldReplyWithVoice(merchant, source)) {
    return _sendVoiceReply(recipient, {
      spokenText,
      textReceipt,
      language,
      voiceGender: 'male', // male voice for all replies
      alsoSendText: false, // Strict single-reply policy to reduce WhatsApp API billing
    });
  }

  return _sendTextMessage(recipient, textReceipt);
}

function friendlyFallback(err, language = 'ur') {
  return spokenPhrases.genericError(language).text;
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
    let merchant = null;
    let staffMember = null;

    // 1. Check if this message is responding to a pending staff transfer invitation
    const transferHandled = await handlePendingStaffTransferFlow(from, message);
    if (transferHandled) return;

    const normFrom = normalizePhone(from) || from;
    const possibleFroms = Array.from(new Set([from, normFrom, normFrom.replace(/^92/, '0')]));

    // 2. Prioritize active staff membership in an active store
    const staffOwner = await Merchant.findOne({
      'staffMembers.whatsappNumber': { $in: possibleFroms },
      'staffMembers.active': true,
      status: { $ne: 'disabled' },
    });

    if (staffOwner) {
      merchant = staffOwner;
      staffMember = staffOwner.staffMembers.find(
        (s) => (possibleFroms.includes(s.whatsappNumber) || normalizePhone(s.whatsappNumber) === normFrom) && s.active
      );
    } else {
      // 3. Otherwise check if this number is an active store owner
      merchant = await Merchant.findOne({
        whatsappNumber: { $in: possibleFroms },
        status: { $ne: 'disabled' },
      });
    }

    if (!merchant) {
      // Check if this message is attempting to join a shop via reference code
      const rawText = message.text?.body?.trim() || '';
      const joinHandled = await handleStaffJoinFlow(from, rawText);
      if (joinHandled) return;

      return await handleUnregisteredNumber(from);
    }

    // Always attach sender phone as _replyToNumber so every response returns to the sender
    merchant._replyToNumber = from;
    if (staffMember) {
      merchant._staffMember = staffMember;
    }

    // `return await` throughout — a bare `return promise()` would let a
    // rejection skip this catch entirely and surface as an unhandled
    // rejection (which kills the Node process by default).
    if (!merchant.onboardingComplete) return await handleOnboarding(merchant, message);
    return await handleOnboardedMerchant(merchant, message);
  } catch (err) {
    console.error('handleIncomingMessage error:', err);
  }
}

/**
 * Handles an assistant's response to an inter-store transfer request.
 */
async function handlePendingStaffTransferFlow(from, message) {
  try {
    const normFrom = normalizePhone(from) || from;
    const possibleFroms = Array.from(new Set([from, normFrom, normFrom.replace(/^92/, '0')]));

    const pendingState = await ConversationState.findOne({
      whatsappNumber: { $in: possibleFroms },
      flow: 'pending_staff_transfer',
    });

    if (!pendingState) return false;

    const rawText = (message.text?.body || message.interactive?.button_reply?.id || message.interactive?.list_reply?.id || '').trim().toLowerCase();
    if (!rawText) return false;

    const data = pendingState.data || {};
    const { newShopId, oldShopId, oldRole, staffName, newShopName, oldShopName } = data;

    // Accept: "1", "1️⃣", "accept", "qubool", "yes", "shamil", "agree", "join", "قبول", "ہاں", "شامل"
    const isAccept = /^(?:1|1️⃣|accept|qubool|yes|shamil|agree|join|قبول|ہاں|شامل)$/i.test(rawText);
    // Reject: "2", "2️⃣", "reject", "mustarad", "no", "cancel", "rehne do", "مسترد", "نہیں", "رہنے\s*دو"
    const isReject = /^(?:2|2️⃣|reject|mustarad|no|cancel|rehne\s*do|مسترد|نہیں|رہنے\s*دو)$/i.test(rawText);

    if (!isAccept && !isReject) {
      await sendTextMessage(
        from,
        `Assalam o Alikum! Barah-e-karam pehle store transfer ka jawab dein:\n\n` +
        `1️⃣ *Qubool karein* (Leave ${oldShopName || 'Purani Dukaan'} & Join ${newShopName || 'Nayi Dukaan'})\n` +
        `2️⃣ *Mustarad karein* (Stay at ${oldShopName || 'Purani Dukaan'})\n\n` +
        `_1 ya 2 likh kar bhejein._`
      );
      return true;
    }

    const newShop = await Merchant.findById(newShopId);
    const oldShop = await Merchant.findById(oldShopId);

    const matchesFrom = (phone) => {
      if (!phone) return false;
      return possibleFroms.includes(phone) || normalizePhone(phone) === normFrom;
    };

    if (isAccept) {
      // 1. Leave old shop
      if (oldShop) {
        if (oldRole === 'owner') {
          const unlinkedSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          oldShop.unlinkedWhatsappNumber = oldShop.whatsappNumber;
          oldShop.whatsappNumber = `unlinked_${unlinkedSuffix}`;
          await oldShop.save();
        } else if (Array.isArray(oldShop.staffMembers)) {
          const oldStaff = oldShop.staffMembers.find((s) => matchesFrom(s.whatsappNumber));
          if (oldStaff) {
            oldStaff.active = false;
            await oldShop.save();
            emitDashboardUpdate(oldShop._id, { type: 'staff', action: 'transferred_out', staff: oldShop.staffMembers });
            const oldOwnerPhone = normalizePhone(oldShop.whatsappNumber) || oldShop.whatsappNumber;
            if (oldOwnerPhone && !oldOwnerPhone.startsWith('unlinked_')) {
              try {
                await sendTextMessage(
                  oldOwnerPhone,
                  `Assalam o Alikum! اطلاع: *${staffName || 'Assistant'}* (${from}) ne aapki dukaan chhor kar *${newShopName || 'Nayi Dukaan'}* join kar li hai.`
                );
              } catch (e) {
                console.error('Failed to notify old shop owner of staff transfer:', e?.message || e);
              }
            }
          }
        }
      }

      // 2. Activate in new shop
      if (newShop && Array.isArray(newShop.staffMembers)) {
        let targetStaff = newShop.staffMembers.find((s) => matchesFrom(s.whatsappNumber));
        if (targetStaff) {
          targetStaff.active = true;
          targetStaff.status = 'active';
        } else {
          newShop.staffMembers.push({
            name: staffName || 'Assistant',
            whatsappNumber: normFrom,
            active: true,
            status: 'active',
            addedAt: new Date(),
            addedBy: 'owner',
          });
        }
        await newShop.save();
        emitDashboardUpdate(newShop._id, {
          type: 'staff',
          action: 'joined',
          staffName: staffName || 'Assistant',
          staffPhone: from,
          staff: newShop.staffMembers,
        });

        const ownerPhone = normalizePhone(newShop.whatsappNumber) || newShop.whatsappNumber;
        if (ownerPhone && !ownerPhone.startsWith('unlinked_')) {
          try {
            await sendTextMessage(
              ownerPhone,
              `Assalam o Alikum! 🎉 *${staffName || 'Assistant'}* (${from}) ne request qubool kar li hai aur ab aapki dukaan (*${newShopName}*) se munsalik hain.`
            );
          } catch (e) {
            console.error('Failed to notify owner of accepted staff transfer:', e?.message || e);
          }
        }
      }

      await ConversationState.deleteMany({
        whatsappNumber: { $in: possibleFroms },
        flow: 'pending_staff_transfer',
      });

      await sendTextMessage(
        from,
        `Assalam o Alikum *${staffName || 'Assistant'}*! 🎉\n\n` +
        `Mubarak ho! Aap ab kamiyabi se *${newShopName || 'Dukaan'}* ke sath shamil ho chuke hain.\n\n` +
        `Ab aap is WhatsApp chat par voice note ya text bhej kar sales aur inventory ka hisab darj kar sakte hain:\n` +
        `🎙️ *"2 doodh 400"*\n` +
        `🎙️ *"Ali ke khate me 2 doodh daal do"*\n\n` +
        `Shuru karne ke liye koi bhi sale ya "inventory" likh kar check karein!`
      );
      return true;
    }

    if (isReject) {
      if (newShop && Array.isArray(newShop.staffMembers)) {
        let pendingStaff = newShop.staffMembers.find((s) => matchesFrom(s.whatsappNumber));
        if (pendingStaff) {
          pendingStaff.active = false;
          pendingStaff.status = 'rejected';
        } else {
          pendingStaff = {
            name: staffName || 'Assistant',
            whatsappNumber: normFrom,
            active: false,
            status: 'rejected',
            addedAt: new Date(),
            addedBy: 'owner',
          };
          newShop.staffMembers.push(pendingStaff);
        }
        await newShop.save();
        emitDashboardUpdate(newShop._id, {
          type: 'staff',
          action: 'rejected',
          staffName: staffName || pendingStaff.name || 'Assistant',
          staffPhone: from,
          staff: newShop.staffMembers,
        });

        const ownerPhone = normalizePhone(newShop.whatsappNumber) || newShop.whatsappNumber;
        if (ownerPhone && !ownerPhone.startsWith('unlinked_')) {
          try {
            await sendTextMessage(
              ownerPhone,
              `Assalam o Alikum! اطلاع: *${staffName || pendingStaff.name || 'Assistant'}* (${from}) ne *${newShopName || 'Aapki dukaan'}* mein shamil hone ki darkhwast mustarad kar di hai aur apni pehli dukaan ke sath rahenge.`
            );
          } catch (e) {
            console.error('Failed to notify owner of rejected staff transfer:', e?.message || e);
          }
        }
      }

      await ConversationState.deleteMany({
        whatsappNumber: { $in: possibleFroms },
        flow: 'pending_staff_transfer',
      });

      await sendTextMessage(
        from,
        `Assalam o Alikum! Aap ne darkhwast mustarad kar di hai.\n\nAap badastoor *${oldShopName || 'apni dukaan'}* ke sath munsalik hain.`
      );
      return true;
    }

    return false;
  } catch (err) {
    console.error('handlePendingStaffTransferFlow error:', err);
    return false;
  }
}

/**
 * Handles an unregistered WhatsApp number attempting to join a shop via Shop Code.
 * (e.g. "join VT-1234 Ali", "shamil VT-1234 Ali", "join VT1234")
 */
async function handleStaffJoinFlow(from, text) {
  const joinMatch =
    text.match(/^(?:join|shamil|connect|شامل|جوائن)\s+([a-zA-Z0-9-]+)(?:\s+(.+))?$/i) ||
    text.match(/^((?:VT|BD)[-]?\d{4,})(?:\s+(.+))?$/i);
  if (!joinMatch) return false;

  const rawCode = joinMatch[1].trim().toUpperCase();
  const staffName = (joinMatch[2] || '').trim();

  const codeWithoutDash = rawCode.replace(/-/g, '');
  const cleanCode = codeWithoutDash.replace(/^(VT|BD)/i, '');
  const codeRegex = new RegExp(`^(VT|BD)[-]?${cleanCode}$`, 'i');

  const merchant = await Merchant.findOne({
    $or: [
      { shopCode: new RegExp(`^${rawCode}$`, 'i') },
      { shopCode: codeRegex },
    ],
  });

  if (!merchant) {
    await sendTextMessage(
      from,
      `❌ *Ghalat Shop Code*\n\nYeh shop code (*${rawCode}*) kisi dukaan se match nahi karta. Barah-e-karam dukaan k malik se sahi Shop Reference Code lein.`
    );
    return true;
  }

  // Owner cannot join their own store as staff
  if (merchant.whatsappNumber === from) {
    await sendTextMessage(
      from,
      `Aap is dukaan (*${merchant.businessName || 'Dukaan'}*) ke malik hain! Aap pehle se is account par full access rakhte hain.`
    );
    return true;
  }

  // Check plan limits
  const tier = merchant.subscriptionTier || 'pro';
  const limit = getStaffLimit(tier);
  const activeStaff = (merchant.staffMembers || []).filter((s) => s.active);

  // Check if already registered
  const existingIndex = (merchant.staffMembers || []).findIndex((s) => s.whatsappNumber === from);
  if (existingIndex >= 0) {
    const existing = merchant.staffMembers[existingIndex];
    if (existing.active) {
      const cleanStoreName = (merchant.businessName || 'Dukaan').split(',')[0].trim();
      await sendTextMessage(
        from,
        `Assalam-o-Alaikum *${existing.name}*! 👋\n\nAap pehle se *${cleanStoreName}* ke sath connected hain.\n\nAap kisi bhi waqt sales, stock, ya hisab voice note ya text k zariye darj kar sakte hain:\n🎙️ *"2 doodh 400"*\n🎙️ *"Ali ke khate me 2 doodh daal do"*`
      );
      return true;
    } else {
      // Reactivate
      existing.active = true;
      if (staffName) existing.name = staffName;
      await merchant.save();
      emitDashboardUpdate(merchant._id, { type: 'staff', action: 'reactivated', staffMember: existing });
      await sendTextMessage(
        from,
        `🎉 Mubarak! Aap ka account *${merchant.businessName || 'Dukaan'}* ke sath dobara active kar diya gaya hai.`
      );
      return true;
    }
  }

  if (activeStaff.length >= limit) {
    await sendTextMessage(
      from,
      `⚠️ *Staff Limit Reached*\n\nIs dukaan par staff members ki hadd (${limit}) mukammal ho chuki hai. Dukaan k malik se bolein ke VerbaTask Pro plan upgrade karein.`
    );
    return true;
  }

  const finalName = staffName || 'Assistant';
  merchant.staffMembers.push({
    name: finalName,
    whatsappNumber: from,
    active: true,
    addedAt: new Date(),
    addedBy: 'whatsapp_code',
  });

  await merchant.save();

  // Notify assistant
  const cleanStoreName = (merchant.businessName || 'Dukaan').split(',')[0].trim();
  await sendTextMessage(
    from,
    `Assalam-o-Alaikum *${finalName}*! 👋\n\nAap *${cleanStoreName}* ke VerbaTask hisab mein shamil ho gaye hain.\n\nAb aap direct yahan voice note ya text bhej kar sales aur hisab darj kar sakte hain:\n🎙️ *"2 doodh 400"*\n🎙️ *"Ali ke khate me 2 doodh daal do"*\n\nShuru karne ke liye abhi koi bhi sale bhej kar check karein!`
  );

  // Notify store owner
  try {
    await sendTextMessage(
      merchant.whatsappNumber,
      `🔔 *Naya Staff Member Connected!*\n\n👤 *${finalName}* (${from}) aapki dukaan se connect ho gaya hai.\nAb unki tamam sales aur entries aapke store ledger aur dashboard par synced hongi.`
    );
  } catch (e) {
    console.warn('Failed to notify merchant owner of new staff join:', e.message);
  }

  emitDashboardUpdate(merchant._id, {
    type: 'staff',
    action: 'joined',
    staffMember: { name: finalName, whatsappNumber: from },
  });

  return true;
}

/**
 * Handles an owner adding a staff member via WhatsApp text command.
 */
async function handleOwnerAddStaffViaText(merchant, rawName, rawPhone) {
  const recipient = merchant._replyToNumber || merchant.whatsappNumber;
  const isUrdu = merchant.language === 'ur';

  // Assistant cannot add other staff
  if (merchant._staffMember) {
    const msg = isUrdu
      ? 'Assalam o Alikum! صرف دکان کا مالک نیا اسٹاف شامل کر سکتا ہے۔'
      : 'Assalam o Alikum! Only the store owner can add staff members.';
    return sendTextMessage(recipient, msg);
  }

  const normalized = normalizePhone(rawPhone);
  if (!normalized) {
    const msg = isUrdu
      ? 'Assalam o Alikum! برائے مہربانی درست پاکستانی فون نمبر درج کریں (مثلاً: 03001234567 یا 923001234567)۔'
      : 'Assalam o Alikum! Please provide a valid Pakistani phone number (e.g. 03001234567 or 923001234567).';
    return sendTextMessage(recipient, msg);
  }

  if (merchant.whatsappNumber === normalized) {
    const msg = isUrdu
      ? 'Assalam o Alikum! آپ اپنی ہی دکان کے مالک ہیں، اپنا نمبر اسٹاف میں شامل نہیں کر سکتے۔'
      : 'Assalam o Alikum! This is your store owner number and cannot be added as staff.';
    return sendTextMessage(recipient, msg);
  }

  const tier = merchant.subscriptionTier || 'pro';
  const limit = getStaffLimit(tier);
  const activeStaff = (merchant.staffMembers || []).filter((s) => s.active);
  if (activeStaff.length >= limit) {
    const msg = isUrdu
      ? `Assalam o Alikum! ⚠️ اسسٹنٹس کی حد (${limit}) مکمل ہو چکی ہے۔ مزید ممبرز کے لیے ویب ڈیش بورڈ پر پرو پلان اپ گریڈ کریں۔`
      : `Assalam o Alikum! ⚠️ Staff limit reached (${limit}). Please upgrade to the Pro plan to add more team members.`;
    return sendTextMessage(recipient, msg);
  }

  const cleanNewStoreName = (merchant.businessName || 'Dukaan').split(',')[0].trim();

  // Check if this number is already linked to another active store
  const otherOwnerShop = await Merchant.findOne({
    whatsappNumber: normalized,
    status: { $ne: 'disabled' },
    _id: { $ne: merchant._id },
  });

  const otherStaffShop = await Merchant.findOne({
    'staffMembers.whatsappNumber': normalized,
    'staffMembers.active': true,
    status: { $ne: 'disabled' },
    _id: { $ne: merchant._id },
  });

  const existingOtherShop = otherOwnerShop || otherStaffShop;

  if (existingOtherShop) {
    const cleanOldStoreName = (existingOtherShop.businessName || 'Dukaan').split(',')[0].trim();

    let staffEntry = (merchant.staffMembers || []).find(
      (s) => normalizePhone(s.whatsappNumber) === normalized
    );

    if (staffEntry) {
      staffEntry.name = rawName.trim();
      staffEntry.active = false;
      staffEntry.status = 'pending_switch';
      staffEntry.pendingFromShopId = existingOtherShop._id;
    } else {
      merchant.staffMembers.push({
        name: rawName.trim(),
        whatsappNumber: normalized,
        active: false,
        status: 'pending_switch',
        pendingFromShopId: existingOtherShop._id,
        addedAt: new Date(),
        addedBy: 'owner',
      });
    }

    await merchant.save();

    await ConversationState.findOneAndUpdate(
      { whatsappNumber: normalized },
      {
        whatsappNumber: normalized,
        merchantId: merchant._id,
        flow: 'pending_staff_transfer',
        step: 'awaiting_confirmation',
        data: {
          newShopId: String(merchant._id),
          oldShopId: String(existingOtherShop._id),
          oldRole: otherOwnerShop ? 'owner' : 'staff',
          staffName: rawName.trim(),
          newShopName: cleanNewStoreName,
          oldShopName: cleanOldStoreName,
        },
      },
      { upsert: true, new: true }
    );

    try {
      await sendTextMessage(
        normalized,
        `Assalam o Alikum *${rawName.trim()}*! 👋\n\n` +
        `Aap ko *${cleanNewStoreName}* mein bator store assistant shamil karne ki request mosool hui hai.\n` +
        `Aap pehle se *${cleanOldStoreName}* ke sath munsalik hain.\n\n` +
        `Kya aap *${cleanOldStoreName}* chhor kar *${cleanNewStoreName}* ko join karna chahte hain?\n\n` +
        `1️⃣ *Qubool karein* (Leave ${cleanOldStoreName} & Join ${cleanNewStoreName})\n` +
        `2️⃣ *Mustarad karein* (Stay at ${cleanOldStoreName})\n\n` +
        `_Jawab dene ke liye 1 ya 2 likh kar bhejein._`
      );
    } catch (e) {}

    emitDashboardUpdate(merchant._id, { type: 'staff', action: 'pending_transfer', staff: merchant.staffMembers });

    const ownerMsg = isUrdu
      ? `Assalam o Alikum! 📩 *${rawName.trim()}* (${normalized}) پہلے سے *${cleanOldStoreName}* کے ساتھ منسلک ہیں۔\nان کو واٹس ایپ پر منتقلی کی درخواست بھیج دی گئی ہے۔ ان کے قبول کرتے ہی وہ آپ کی دکان سے جڑ جائیں گے۔`
      : `Assalam o Alikum! 📩 *${rawName.trim()}* (${normalized}) is already linked with *${cleanOldStoreName}*.\nA transfer request has been sent to them on WhatsApp. Once they accept, they will be active in your store.`;
    return sendTextMessage(recipient, ownerMsg);
  }

  let existing = (merchant.staffMembers || []).find(
    (s) => normalizePhone(s.whatsappNumber) === normalized
  );

  if (existing) {
    if (existing.active) {
      const msg = isUrdu
        ? `Assalam o Alikum! *${existing.name}* پہلے ہی آپ کی دکان کے فعال ممبر ہیں۔`
        : `Assalam o Alikum! *${existing.name}* is already an active member of your store.`;
      return sendTextMessage(recipient, msg);
    } else {
      existing.active = true;
      existing.status = 'active';
      existing.name = rawName.trim();
      existing.whatsappNumber = normalized;
      await merchant.save();
    }
  } else {
    merchant.staffMembers.push({
      name: rawName.trim(),
      whatsappNumber: normalized,
      active: true,
      status: 'active',
      addedAt: new Date(),
      addedBy: 'owner',
    });
    await merchant.save();
  }

  try {
    await sendTextMessage(
      normalized,
      `Assalam o Alikum *${rawName.trim()}*! 👋\n\n` +
      `Aap ko *${cleanNewStoreName}* ke VerbaTask hisab mein shamil kar liya gaya hai.\n\n` +
      `Ab aap direct is WhatsApp chat par bol kar (voice note) ya likh kar sales aur stock darj kar sakte hain:\n` +
      `🎙️ *"2 doodh 400"*\n` +
      `🎙️ *"Ali ke khate me 2 doodh daal do"*\n\n` +
      `Shuru karne ke liye abhi koi bhi sale bhej kar check karein!`
    );
  } catch (e) {}

  emitDashboardUpdate(merchant._id, { type: 'staff', action: 'updated', staff: merchant.staffMembers });

  const successMsg = isUrdu
    ? `Assalam o Alikum! 🎉 *${rawName.trim()}* (${normalized}) کو کامیابی سے آپ کی دکان کے کھاتے میں شامل کر لیا گیا ہے۔`
    : `Assalam o Alikum! 🎉 *${rawName.trim()}* (${normalized}) has been successfully added to your store team.`;
  return sendTextMessage(recipient, successMsg);
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
  const targetPhone = getSenderRecipient(merchant);
  const linkCode = await generateLinkCode(targetPhone);

  await sendTextMessage(
    targetPhone,
    `Your VerbaTask linking code: *${linkCode.code}*\n(valid for 15 minutes)\n\nEnter it on the Link Code page to connect this number to your dashboard account.`
  );
}

/**
 * Onboarding conversation: language → business details → initial stock.
 * Progress persists in ConversationState between messages and is deleted
 * once onboardingComplete is set on the merchant.
 */
async function handleOnboarding(merchant, message) {
  let state = await ConversationState.findOne({ whatsappNumber: getSenderRecipient(merchant) });
  if (!state) {
    state = await ConversationState.create({
      whatsappNumber: getSenderRecipient(merchant),
      merchantId: merchant._id,
      flow: 'onboarding',
      step: 'awaiting_language',
    });
    return sendInteractiveButtons(getSenderRecipient(merchant), 'Please choose your language:', [
      { id: 'lang_ur', title: 'اردو' },
      { id: 'lang_en', title: 'English' },
    ]);
  }

  const replyId = message.interactive?.button_reply?.id;
  let text = message.text?.body?.trim();
  const isVoice = message.type === 'audio';

  // Support voice notes in onboarding: transcribe audio via Whisper
  if (isVoice && message.audio?.id) {
    try {
      const { buffer, mimeType } = await downloadMedia(message.audio.id);
      const res = await transcribeAndParse(buffer, mimeType, merchant.language, merchant);
      text = res?.transcript?.trim() || '';
    } catch (err) {
      console.error('Onboarding voice note transcription failed:', err.message);
    }
  }

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
      return replyToMerchant(merchant, spokenPhrases.onboardingAskDetails(language), 'text');
    }

    case 'awaiting_business_details': {
      if (!text) {
        return replyToMerchant(
          merchant,
          isVoice
            ? spokenPhrases.voiceProcessingError(merchant.language)
            : 'Please send this as text or a voice note.',
          isVoice ? 'voice' : 'text'
        );
      }
      // Qwen extracts name/location/sells; if it can't (no key, timeout,
      // garbage JSON) keep the raw text on businessName so onboarding never
      // blocks on a flaky NLP call.
      const details = await extractBusinessDetails(text);
      merchant.businessName = details?.businessName || text;
      if (details?.businessType) merchant.businessType = details.businessType;
      if (details?.location) merchant.location = details.location;
      if (details?.sells) merchant.sells = details.sells;
      await merchant.save();
      state.step = 'awaiting_inventory';
      await state.save();
      return replyToMerchant(
        merchant,
        {
          spoken: `${merchant.businessName}. ${spokenPhrases.onboardingAskInventory(merchant.language).spoken}`,
          text: `Got it — ${merchant.businessName}${details?.businessType ? ` (${details.businessType})` : ''}. ${spokenPhrases.onboardingAskInventory(merchant.language).text}`,
        },
        isVoice ? 'voice' : 'text'
      );
    }

    case 'awaiting_inventory': {
      if (!text) {
        return replyToMerchant(
          merchant,
          isVoice
            ? spokenPhrases.voiceProcessingError(merchant.language)
            : 'Please send your stock list as text or a voice note.',
          isVoice ? 'voice' : 'text'
        );
      }
      let addedCount = 0;
      let itemsToInsert = [];
      
      if (text.toLowerCase() !== 'skip') {
        const items = await extractInventoryItems(text);
        if (items?.length) {
          itemsToInsert = items.map((i) => ({
            merchantId: merchant._id,
            name: cleanAndStandardizeItemName(i.name),
            quantity: i.quantity,
            ...(i.price != null && { price: i.price }),
            ...(i.unit && { unit: i.unit }),
          }));
        } else {
          itemsToInsert = [{
            merchantId: merchant._id,
            name: cleanAndStandardizeItemName(text),
            quantity: 0,
          }];
        }
      }

      // Add starter catalog items if available for the business type
      const { starterCatalogs } = await import('../constants/retailStarterCatalog.js');
      const bType = merchant.businessType || 'general';
      const starterItems = starterCatalogs[bType] || starterCatalogs['general'];
      
      for (const si of starterItems) {
        itemsToInsert.push({
          merchantId: merchant._id,
          name: si.name,
          quantity: si.quantity,
          unit: si.unit,
          price: 0, // default 0 until merchant updates it
        });
      }

      if (itemsToInsert.length > 0) {
        await InventoryItem.insertMany(itemsToInsert);
        addedCount = itemsToInsert.length;
        invalidateMerchantCatalog(merchant._id);
      }
      merchant.onboardingComplete = true;
      await merchant.save();
      emitDashboardUpdate(merchant._id, { type: 'onboarding' });
      await ConversationState.deleteOne({ _id: state._id });
      return replyToMerchant(
        merchant,
        spokenPhrases.onboardingComplete(merchant.language, addedCount),
        isVoice ? 'voice' : 'text'
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
  console.log('RECEIVED MESSAGE:', JSON.stringify(message, null, 2));
  try {
    // Check approval button taps first — before the guided-order state check so
    // an approve/reject tap mid-guided-order isn't swallowed by that flow.
    if (message.type === 'interactive') {
      const buttonId = message.interactive?.button_reply?.id;
      if (buttonId?.startsWith('approve_') || buttonId?.startsWith('reject_')) {
        return await handleApprovalReply(merchant, buttonId);
      }
      
      if (buttonId?.startsWith('clearexpiry_')) {
        return await handleClearExpiryReply(merchant, buttonId);
      }

      // "Did you mean?" replies for fuzzy item matches — checked early so a
      // mid-flow guided order doesn't swallow the tap.
      if (buttonId?.startsWith('pick_')) {
        return await handleDisambiguationReply(merchant, buttonId);
      }

      // Customer disambiguation replies
      if (buttonId?.startsWith('cust_same_') || buttonId === 'cust_new') {
        return await handleCustomerDisambiguationReply(merchant, buttonId);
      }

      if (buttonId === 'wf_save' || buttonId === 'wf_cancel') {
        return await handleWorkflowConfirmReply(merchant, buttonId);
      }

      // Language selection buttons
      if (buttonId === 'set_lang_ur') {
        merchant.language = 'ur';
        await merchant.save();
        return replyToMerchant(merchant, {
          spoken: 'آپ کی زبان کامیابی سے اردو میں تبدیل کر دی گئی ہے۔ اب آپ کے تمام جوابات اردو میں دیے جائیں گے۔',
          text: '✅ زبان تبدیل کر دی گئی ہے: اردو۔ اب تمام جوابات اردو میں ملیں گے۔'
        }, 'voice', 'ur');
      }
      if (buttonId === 'set_lang_en') {
        merchant.language = 'en';
        await merchant.save();
        return replyToMerchant(merchant, {
          spoken: 'Language has been switched to English successfully. All responses will now be in English.',
          text: '✅ Language changed to English. All replies will now be in English.'
        }, 'voice', 'en');
      }

      // Voice replies buttons
      if (buttonId === 'set_voice_on') {
        merchant.voiceReplies = true;
        await merchant.save();
        emitDashboardUpdate(merchant._id, { type: 'profile' });
        return replyToMerchant(merchant, {
          spoken: merchant.language === 'ur' ? 'وائس جوابات چالو کر دیے گئے ہیں۔' : 'Voice replies have been enabled.',
          text: merchant.language === 'ur' ? '🔊 وائس جوابات چالو کر دیے گئے ہیں۔' : '🔊 Voice replies enabled.',
        }, 'voice');
      }
      if (buttonId === 'set_voice_off') {
        merchant.voiceReplies = false;
        await merchant.save();
        emitDashboardUpdate(merchant._id, { type: 'profile' });
        return sendTextMessage(
          getSenderRecipient(merchant),
          merchant.language === 'ur' ? '🔇 وائس جوابات بند کر دیے گئے ہیں۔ اب تمام جوابات ٹیکسٹ میں ملیں گے۔' : '🔇 Voice replies disabled. All replies will be in text.'
        );
      }
      if (buttonId === 'set_voice_gender_male') {
        merchant.voiceGender = 'male';
        await merchant.save();
        emitDashboardUpdate(merchant._id, { type: 'profile' });
        const phrases = spokenPhrases.voiceSwitched(merchant.language, 'male');
        return replyToMerchant(merchant, phrases, 'voice');
      }
      if (buttonId === 'set_voice_gender_female') {
        merchant.voiceGender = 'female';
        await merchant.save();
        emitDashboardUpdate(merchant._id, { type: 'profile' });
        const phrases = spokenPhrases.voiceSwitched(merchant.language, 'female');
        return replyToMerchant(merchant, phrases, 'voice');
      }

      // Quick menu buttons
      if (buttonId === 'menu_help') {
        return await sendHelpCommandsMenu(merchant);
      }
      if (buttonId === 'menu_stock') {
        return await sendStockListSummary(merchant);
      }
      if (buttonId === 'menu_reports') {
        return await sendReportPicker(merchant);
      }
      if (buttonId === 'menu_settings' || buttonId === 'menu_profile') {
        return await sendProfileSettings(merchant);
      }
      if (buttonId === 'menu_banks') {
        return await sendPaymentSettings(merchant);
      }

      // Quick report trigger buttons
      if (buttonId?.startsWith('report_')) {
        const reportType = buttonId.replace('report_', '');
        return await handleReportRequest(merchant, reportType, 'text', merchant.language || 'ur');
      }

      // Payment method toggle button
      if (buttonId?.startsWith('toggle_pay_')) {
        const methodId = buttonId.replace('toggle_pay_', '');
        return await handleTogglePaymentMethod(merchant, methodId);
      }

      // Fast-path: If user taps ANY payment button (e.g. pay_cash, pay_easypaisa, pay_jazzcash)
      if (buttonId?.startsWith('pay_')) {
        const existingState = await ConversationState.findOne({
          whatsappNumber: getSenderRecipient(merchant),
          flow: 'guided_order',
        });
        if (existingState) {
          const method = buttonId.replace('pay_', '');
          existingState.data = {
            ...(existingState.data || {}),
            paymentMethod: method,
            quantity: existingState.data?.quantity || 1,
          };
          return await finalizeGuidedOrder(merchant, existingState);
        }
      }
    }

    const existingState = await ConversationState.findOne({
      whatsappNumber: getSenderRecipient(merchant),
      flow: 'guided_order',
    });
    if (existingState) {
      // An abandoned guided order used to swallow EVERY subsequent message
      // forever (nothing ever reached the workflows or NLP again). Expire it
      // after 30 idle minutes and fall through to normal routing instead.
      const idleMs = Date.now() - new Date(existingState.updatedAt).getTime();
      if (idleMs > 30 * 60 * 1000) {
        await ConversationState.deleteOne({ _id: existingState._id });
      } else if (message.type === 'text' && message.text?.body?.toLowerCase().includes('report')) {
        // Global override: If they explicitly ask for a report, abort the guided flow
        await ConversationState.deleteOne({ _id: existingState._id });
      } else {
        return await continueGuidedOrder(merchant, message, existingState);
      }
    }

    if (message.type === 'text') {
      return await handleTextMessage(merchant, message.text.body, message);
    }

    if (message.type === 'interactive') {
      const listId = message.interactive?.list_reply?.id;
      
      if (listId?.startsWith('pay_')) {
        const existingState = await ConversationState.findOne({
          whatsappNumber: getSenderRecipient(merchant),
          flow: 'guided_order',
        });
        if (existingState) {
          const method = listId.replace('pay_', '');
          existingState.data = {
            ...(existingState.data || {}),
            paymentMethod: method,
            quantity: existingState.data?.quantity || 1,
          };
          return await finalizeGuidedOrder(merchant, existingState);
        }
      }
      
      if (listId === 'start_guided_order') return await startGuidedOrder(merchant);
      return sendTextMessage(getSenderRecipient(merchant), "Sorry, I didn't expect that reply — try again?");
    }

    if (message.type === 'audio') {
      return await handleVoiceNote(merchant, message.audio.id, message);
    }

    if (message.type === 'image') {
      // Optional OCR path — not the primary flow. Ack for now.
      return sendTextMessage(
        getSenderRecipient(merchant),
        "Got your image — screenshot reconciliation isn't wired up yet, log this sale manually for now."
      );
    }

    return sendTextMessage(getSenderRecipient(merchant), "I can't handle that message type yet.");
  } catch (err) {
    console.error('handleOnboardedMerchant error:', err);
    return sendTextMessage(getSenderRecipient(merchant), friendlyFallback(err));
  }
}

/** Handles follow-up replies when a merchant is adding a new item that requires compulsory price & unit. */
export async function handlePendingNewItemReply(merchant, text, source, pendingState, rawMessage = null) {
  const language = merchant.language || 'ur';
  const isUrdu = language === 'ur';
  const lower = text.trim().toLowerCase();

  // Cancel check
  if (/^(cancel|no|nahi|منسوخ|خارج|چھوڑو|نہیں|stop)$/i.test(lower)) {
    await ConversationState.deleteOne({ _id: pendingState._id });
    const phrases = isUrdu
      ? {
          text: '❌ نیا آئٹم شامل کرنے کا عمل منسوخ کر دیا گیا ہے۔',
          spoken: 'نیا آئٹم شامل کرنے کا عمل منسوخ کر دیا گیا ہے۔',
        }
      : {
          text: '❌ New item addition has been cancelled.',
          spoken: 'New item addition has been cancelled.',
        };
    return replyToMerchant(merchant, phrases, source, language);
  }

  const { price: parsedPrice, unit: parsedUnit } = parsePriceAndUnit(text);
  const data = pendingState.data || {};
  const currentItem = data.item || {};

  if (parsedPrice && parsedPrice > 0) {
    currentItem.price = parsedPrice;
  }
  if (parsedUnit) {
    currentItem.unit = parsedUnit;
  }

  const hasPrice = currentItem.price != null && Number(currentItem.price) > 0;
  const hasUnit = Boolean(currentItem.unit && String(currentItem.unit).trim());

  if (hasPrice && hasUnit) {
    const itemName = currentItem.name || currentItem.rawName || 'Item';
    const quantity = Math.max(1, parseInt(currentItem.quantity, 10) || 1);
    const price = Number(currentItem.price);
    const unit = String(currentItem.unit).trim();

    const item = await InventoryItem.create({
      merchantId: merchant._id,
      name: itemName,
      quantity,
      price,
      unit,
    });

    await ConversationState.deleteOne({ _id: pendingState._id });

    invalidateMerchantCatalog(merchant._id);
    emitDashboardUpdate(merchant._id, {
      type: 'inventory',
      action: 'create',
      itemId: item._id,
      itemName: item.name,
      quantity: item.quantity,
      price: item.price,
      unit: item.unit,
    });

    evaluateThresholdWorkflows(merchant._id, item).catch((err) =>
      console.error('Threshold workflow evaluation failed:', err.message)
    );

    const phrases = spokenPhrases.newItemAdded(language, {
      itemName: item.name,
      quantity: item.quantity,
      price: item.price,
      unit: item.unit,
    });

    return replyToMerchant(merchant, phrases, source, language);
  }

  // Still missing either price or unit
  data.item = currentItem;
  await ConversationState.findByIdAndUpdate(pendingState._id, { $set: { data } });

  const prompt = spokenPhrases.newItemDetailsRequired(language, {
    itemName: currentItem.name || currentItem.rawName || 'Item',
    missingPrice: !hasPrice,
    missingUnit: !hasUnit,
    unit: hasUnit ? currentItem.unit : null,
  });

  return replyToMerchant(merchant, { text: prompt.text, spoken: prompt.spoken }, source, language);
}

/** Typed text: "order" starts the guided flow, "link"/"code" resends the dashboard linking code, message workflows are checked next, anything else goes through Qwen NLP. */
async function handleTextMessage(merchant, text, rawMessage = null) {
  const normalized = text.trim().toLowerCase();

  // 0. Active Pending New Item flow check
  const pendingNewItem = await ConversationState.findOne({
    whatsappNumber: getSenderRecipient(merchant),
    flow: 'pending_new_item',
  });
  if (pendingNewItem) {
    const idleMs = Date.now() - new Date(pendingNewItem.updatedAt).getTime();
    if (idleMs > 30 * 60 * 1000) {
      await ConversationState.deleteOne({ _id: pendingNewItem._id });
    } else {
      return await handlePendingNewItemReply(merchant, text, 'text', pendingNewItem, rawMessage);
    }
  }

  // 1. Core Guided & Link Commands
  if (/^(order|sale|log)$/i.test(normalized)) return startGuidedOrder(merchant);
  if (normalized === 'link' || normalized === 'code') return sendLinkCodeToMerchant(merchant);

  // 2. Help & Commands Guide
  if (/^(help|cmds|commands|menu|madad|رہنمائی|مینیو|کمانڈز)$/i.test(normalized)) {
    return await sendHelpCommandsMenu(merchant);
  }

  // 3. Stock List & Inventory Summary
  if (/^(stock\s*list|inventory|saman|سارا\s*اسٹاک|اسٹاک\s*لسٹ)$/i.test(normalized)) {
    return await sendStockListSummary(merchant);
  }

  // 4. Reports Menu or Direct Report Request
  if (/^(report|reports|pdf\s*report|رپورٹ|رپورٹس)$/i.test(normalized)) {
    return await sendReportPicker(merchant);
  }

  // 5. Profile & Store Settings
  if (/^(profile|settings|account|dukaan|دکان|سیٹنگز)$/i.test(normalized)) {
    return await sendProfileSettings(merchant);
  }

  // 6. Payment & Banks
  if (/^(banks|payment\s*methods|ادائیگی|بینک)$/i.test(normalized)) {
    return await sendPaymentSettings(merchant);
  }

  // 7. Workflows / Automations List
  if (/^(workflows|automations|alerts|الرٹس)$/i.test(normalized)) {
    return await sendWorkflowsList(merchant);
  }

  // 8. Store Settings Mutators via WhatsApp
  // Rename shop
  const renameMatch = text.match(/^(?:set\s*name|rename\s*(?:shop|store)?)\s+(.+)$/i) || text.match(/^دکان\s*کا\s*نام\s+(.+)$/);
  if (renameMatch) {
    const newName = renameMatch[1].trim();
    merchant.businessName = newName;
    await merchant.save();
    emitDashboardUpdate(merchant._id, { type: 'profile' });
    const msg = merchant.language === 'ur'
      ? `✅ دکان کا نام کامیابی سے *"${newName}"* رکھ دیا گیا ہے۔`
      : `✅ Store name updated to *"${newName}"*.`;
    return replyToMerchant(merchant, msg, 'text');
  }

  // Set Location
  const locMatch = text.match(/^(?:set\s*location|change\s*location)\s+(.+)$/i) || text.match(/^مقام\s+(.+)$/);
  if (locMatch) {
    const newLoc = locMatch[1].trim();
    merchant.location = newLoc;
    await merchant.save();
    emitDashboardUpdate(merchant._id, { type: 'profile' });
    const msg = merchant.language === 'ur'
      ? `✅ دکان کا مقام کامیابی سے *"${newLoc}"* اپڈیٹ ہو گیا ہے۔`
      : `✅ Store location updated to *"${newLoc}"*.`;
    return replyToMerchant(merchant, msg, 'text');
  }

  // Set / Update Item Price (e.g. "set price rice 300", "price chini 160", "rice 250 rs", "چینی کی قیمت 150")
  const setPriceMatch = text.match(/^(?:set\s*price|price|rate|قیمت|ریٹ)\s+([a-zA-Z\s\u0600-\u06FF-]+?)\s+(?:to|=|is)?\s*(\d+)$/i) ||
                        text.match(/^([a-zA-Z\s\u0600-\u06FF-]+?)\s+(?:ki\s*price|ka\s*rate|کی\s*قیمت|کا\s*ریٹ)\s+(\d+)$/i) ||
                        text.match(/^([a-zA-Z\s\u0600-\u06FF-]+?)\s+(\d+)\s*(?:rs|rupees|rupay|روپے)$/i);
  if (setPriceMatch) {
    const rawItem = setPriceMatch[1].trim();
    const newPrice = parseInt(setPriceMatch[2], 10);
    const result = await updateItemPriceViaCrm(merchant, rawItem, newPrice);
    return replyToMerchant(merchant, result, 'text');
  }

  // Voice toggle
  const voiceMatch = text.match(/^(?:voice|voice\s*reply|voice\s*note|awaz|aawaz)\s+(on|off)$/i) || text.match(/^(?:وائس|آواز)\s*(?:جواب)?\s+(آن|بند|اف)$/i);
  if (voiceMatch) {
    const isVoiceOn = /^(on|آن)$/i.test(voiceMatch[1]);
    merchant.voiceReplies = isVoiceOn;
    await merchant.save();
    emitDashboardUpdate(merchant._id, { type: 'profile' });
    const msg = merchant.language === 'ur'
      ? (isVoiceOn ? '🔊 وائس جوابات چالو کر دیے گئے ہیں۔' : '🔇 وائس جوابات بند کر دیے گئے ہیں۔')
      : (isVoiceOn ? '🔊 Voice replies enabled.' : '🔇 Voice replies disabled.');
    return replyToMerchant(merchant, msg, 'text');
  }

  // Automation confirmation toggle ("confirm on" / "confirm off")
  const confirmMatch = text.match(/^confirm\s+(on|off)$/i) || text.match(/^تصدیق\s+(آن|بند)$/);
  if (confirmMatch) {
    const isOn = /^(on|آن)$/i.test(confirmMatch[1]);
    merchant.confirmAutomations = isOn;
    await merchant.save();
    emitDashboardUpdate(merchant._id, { type: 'profile' });
    const msg = merchant.language === 'ur'
      ? (isOn ? '✅ اب ہر نئی آٹومیشن محفوظ کرنے سے پہلے میں آپ سے پوچھوں گا۔' : '✅ اب نئی آٹومیشن فوراً محفوظ ہو جائے گی۔')
      : (isOn ? "✅ I'll now ask you to Save or Cancel each new automation." : '✅ New automations will now be saved straight away.');
    return replyToMerchant(merchant, msg, 'text');
  }

  // Enable payment method
  const enableMatch = text.match(/^(?:enable|add)\s+([a-zA-Z\s-]+)$/i);
  if (enableMatch) {
    return await handleTogglePaymentMethod(merchant, enableMatch[1], true);
  }

  // Disable payment method
  const disableMatch = text.match(/^(?:disable|remove)\s+([a-zA-Z\s-]+)$/i);
  if (disableMatch) {
    return await handleTogglePaymentMethod(merchant, disableMatch[1], false);
  }

  // Urdu payment method toggle (e.g. "ایزی پیسہ آن", "جاز کیش بند", "سادا پے آن کرو")
  const urduPayMatch = text.match(/^([a-zA-Z\s\u0600-\u06FF-]+?)\s+(آن|آن\s*کرو|بند|بند\s*کرو)$/i);
  if (urduPayMatch) {
    const isEnable = /آن/.test(urduPayMatch[2]);
    return await handleTogglePaymentMethod(merchant, urduPayMatch[1], isEnable);
  }

  // Language switching commands
  if (/^(urdu|اردو)$/i.test(normalized)) {
    merchant.language = 'ur';
    await merchant.save();
    return replyToMerchant(merchant, {
      spoken: 'آپ کی زبان کامیابی سے اردو میں تبدیل کر دی گئی ہے۔ اب آپ کے تمام جوابات اردو میں دیے جائیں گے۔',
      text: '✅ زبان تبدیل کر دی گئی ہے: اردو۔ اب تمام جوابات اردو میں ملیں گے۔'
    }, 'text', 'ur');
  }

  if (/^english$/i.test(normalized)) {
    merchant.language = 'en';
    await merchant.save();
    return replyToMerchant(merchant, {
      spoken: 'Language has been switched to English successfully. All responses will now be in English.',
      text: '✅ Language changed to English. All replies will now be in English.'
    }, 'text', 'en');
  }

  if (/^(language|زبان)$/i.test(normalized)) {
    return sendInteractiveButtons(getSenderRecipient(merchant), 'Please choose your language / اپنی زبان منتخب کریں:', [
      { id: 'set_lang_ur', title: 'اردو' },
      { id: 'set_lang_en', title: 'English' },
    ]);
  }

  // 9. Daily Hisab / Sales Summary (e.g. "aaj ka hisab", "today summary", "daily sales", "آج کا حساب")
  if (/^(?:aaj\s*ka\s*hisab|today\s*summary|daily\s*sales|daily\s*report|آج\s*کا\s*حساب|آج\s*کی\s*سیل)$/i.test(normalized)) {
    return await handleDailyHisab(merchant);
  }

  // 10. Low Stock Check (e.g. "low stock", "kam maal", "کم اسٹاک", "کم مال")
  if (/^(?:low\s*stock|kam\s*maal|کم\s*اسٹاک|کم\s*مال)$/i.test(normalized)) {
    return await handleLowStockCheck(merchant);
  }

  // 11. Forgot Password via WhatsApp (e.g. "forgot password", "reset password", "password bhool gaya", "پاسورڈ بھول گیا")
  if (/^(?:forgot\s*password|reset\s*password|password\s*(?:bhool|change|reset)|پاسورڈ\s*(?:بھول|ری\s*سیٹ))$/i.test(normalized)) {
    return await handleForgotPassword(merchant);
  }

  // 12. Voice Gender Switch via WhatsApp (e.g. "female voice", "male voice", "aurat ki awaz", "mard ki awaz", "عورت کی آواز", "مرد کی آواز", "awaz badlo")
  const genderChoice = parseVoiceGenderChange(text);
  if (genderChoice) {
    return await handleVoiceGenderChange(merchant, genderChoice, 'text');
  }

  // 12b. Khata creation and statement report — checked before settle/inquiry because words like
  // "khata" and "report" would otherwise be read as a balance inquiry.
  const khataCreateMatch = parseKhataCreateHeuristic(text);
  if (khataCreateMatch) {
    return await handleKhataCreate(merchant, khataCreateMatch.customerName, khataCreateMatch.phone || (khataCreateMatch.invalidPhone ? 'invalid' : null), 'text');
  }
  const khataReportMatch = parseKhataReportHeuristic(text);
  if (khataReportMatch) {
    return await handleKhataReport(merchant, khataReportMatch.customerName, 'text');
  }

  // 13. Khata Settlement via WhatsApp (e.g. "ali ne 500 diye", "settle 500 ali", "ali paid 500", "علی نے 500 دیے", "پانچ سو علی نے دیے")
  const settleMatch = parseKhataSettleHeuristic(text);
  if (settleMatch) {
    return await handleKhataSettle(merchant, settleMatch.customerName, settleMatch.amount, 'text');
  }
  const settleMatch1 = text.match(/^([a-zA-Z\s\u0600-\u06FF-]+?)\s+(?:ne\s*)?(\d+)\s*(?:rupay|rs|روپے)?\s*(?:diye|jama|wapis|de\s*diye|paid|settle)$/i);
  const settleMatch2 = text.match(/^(?:settle|jama)\s*(\d+)\s+([a-zA-Z\s\u0600-\u06FF-]+)$/i);
  if (settleMatch1) {
    return await handleKhataSettle(merchant, settleMatch1[1], settleMatch1[2], 'text');
  } else if (settleMatch2) {
    return await handleKhataSettle(merchant, settleMatch2[2], settleMatch2[1], 'text');
  }

  // 14. Khata Inquiry via WhatsApp (e.g. "ali ka khata", "check khata ali", "ali ka kitna baqi hai", "علی کا کھاتہ")
  const inquiryMatch = parseKhataInquiryHeuristic(text);
  if (inquiryMatch) {
    return await handleKhataInquiry(merchant, inquiryMatch.customerName, 'text');
  }
  const khataCheckMatch1 = text.match(/^(?:check\s*khata|khata|udhar|udhaar|باقی|کھاتہ)\s+([a-zA-Z\s\u0600-\u06FF-]+)$/i);
  const khataCheckMatch2 = text.match(/^([a-zA-Z\s\u0600-\u06FF-]+)\s+(?:ka\s*khata|ka\s*kitna\s*(?:baqi|hai)|کے\s*کتنے\s*باقی|کا\s*ادھار)$/i);
  if (khataCheckMatch1) {
    return await handleKhataInquiry(merchant, khataCheckMatch1[1], 'text');
  } else if (khataCheckMatch2) {
    return await handleKhataInquiry(merchant, khataCheckMatch2[1], 'text');
  }

  // 14. Shop Reference Code (e.g. "shop code", "dukaan code", "دکان کوڈ", "ریفرنس کوڈ")
  if (/^(?:shop\s*code|dukaan\s*code|reference\s*code|دکان\s*کوڈ|کوڈ|ریفرنس\s*کوڈ)$/i.test(normalized)) {
    if (!merchant.shopCode) {
      merchant.shopCode = `VT-${Math.floor(1000 + Math.random() * 9000)}`;
      await merchant.save();
    }
    const msg = merchant.language === 'ur'
      ? `🏪 *آپ کی دکان کا ریفرنس کوڈ:*\n\n🔑 *${merchant.shopCode}*\n\nاپنے دکان کے اسسٹنٹس/لڑکوں کو یہ کوڈ دیں تاکہ وہ ایک ہی کھاتے میں سیلز درج کر سکیں۔\nوہ واٹس ایپ پر صرف یہ میسج بھیجیں:\n👉 *join ${merchant.shopCode} [ان کا نام]*`
      : `🏪 *Your Shop Reference Code:*\n\n🔑 *${merchant.shopCode}*\n\nShare this code with your shop assistants so all sales sync to your store account.\nThey simply text:\n👉 *join ${merchant.shopCode} [Their Name]*`;
    return sendTextMessage(getSenderRecipient(merchant), msg);
  }

  // 15. Staff / Team List (e.g. "staff", "staff list", "team", "ہماری ٹیم", "ہمارا سٹاف")
  if (/^(?:staff|staff\s*list|team|hamara\s*staff|ہماری\s*ٹیم|ہمارا\s*سٹاف|عملہ)$/i.test(normalized)) {
    const activeStaff = (merchant.staffMembers || []).filter((s) => s.active);
    const limit = getStaffLimit(merchant.subscriptionTier || 'pro');
    if (activeStaff.length === 0) {
      const msg = merchant.language === 'ur'
        ? `👥 *دکان سٹاف:*\nابھی تک کوئی اسسٹنٹ شامل نہیں ہوا۔\n\nاسسٹنٹ شامل کرنے کے لیے انہیں اپنا دکان کوڈ دیں: *${merchant.shopCode || 'VT-XXXX'}*\nوہ لکھ کر بھیجیں: *join ${merchant.shopCode || 'VT-XXXX'} [نام]*`
        : `👥 *Store Team:*\nNo assistants connected yet.\n\nTo link staff, share your shop code: *${merchant.shopCode || 'VT-XXXX'}*\nThey text: *join ${merchant.shopCode || 'VT-XXXX'} [Name]*`;
      return sendTextMessage(getSenderRecipient(merchant), msg);
    }

    const lines = activeStaff.map((s, idx) => `${idx + 1}. *${s.name}* (${s.whatsappNumber})`).join('\n');
    const msg = merchant.language === 'ur'
      ? `👥 *دکان کی ٹیم (${activeStaff.length}/${limit}):*\n\n${lines}\n\nنئے ملازم شامل کرنے کے لیے کوڈ: *${merchant.shopCode}*`
      : `👥 *Store Team (${activeStaff.length}/${limit}):*\n\n${lines}\n\nTo add more staff: *join ${merchant.shopCode} [Name]*`;
    return sendTextMessage(getSenderRecipient(merchant), msg);
  }

  // 15b. Shop Code echo or join attempt from already connected staff/merchant
  const shopCodeEcho = normalized.match(/^(?:(?:join|shamil|connect|شامل|جوائن)\s+)?((?:vt|bd)[-]?\d{4,})(?:\s+(.+))?$/i);
  if (shopCodeEcho) {
    const isAssistant = Boolean(merchant._staffMember);
    const recipient = getSenderRecipient(merchant);
    const cleanStoreName = (merchant.businessName || 'Dukaan').split(',')[0].trim();
    if (isAssistant) {
      const msg = `Assalam o Alikum *${merchant._staffMember.name}*! 👋\n\nAap pehle se *${cleanStoreName}* ke sath connected hain.\n\nAap ko koi code bhejne ki zaroorat nahi — aap direct voice note ya message bhej kar sale darj kar sakte hain:\n🎙️ *"2 doodh 400"*\n🎙️ *"Ali ke khate me 2 doodh daal do"*`;
      return sendTextMessage(recipient, msg);
    } else {
      const msg = `Assalam o Alikum! 👋\n\nAap is dukaan (*${cleanStoreName}*) ke malik hain.\nYeh aap ki dukaan ka reference code hai: *${merchant.shopCode || shopCodeEcho[1].toUpperCase()}*.\n\nStaff ko add karne ke لیے web dashboard se unka number enter karein ya unse kahein ke is number par voice note bhej kar sales darj karein.`;
      return sendTextMessage(recipient, msg);
    }
  }

  // 15c. Add staff command via text message:
  // e.g. "add staff Hamza 03001234567", "add assistant Tariq 03451234567", "اسٹاف شامل کریں حمزہ 03001234567", "اسٹاف حمزہ 03001234567"
  const addStaffMatch = normalized.match(/^(?:add\s+staff|add\s+assistant|اسٹاف\s*شامل\s*(?:کریں)?|نیا\s*اسٹاف|اسٹاف)\s+([a-zA-Z\u0600-\u06FF\s]+?)\s+(\+?\d[\d\s-]{9,15})$/i);
  if (addStaffMatch) {
    return await handleOwnerAddStaffViaText(merchant, addStaffMatch[1].trim(), addStaffMatch[2].trim());
  }

  // Check stored message workflows first — if any fire, skip NLP entirely
  try {
    const triggered = await evaluateMessageWorkflows(merchant._id, text);
    if (triggered.length > 0) return; // workflow(s) already replied to the merchant
  } catch (err) {
    console.error('evaluateMessageWorkflows error:', err.message);
  }

  let intent;
  try {
    intent = await parseIntent(text, merchant);
  } catch (err) {
    console.error('parseIntent failed:', err);
    const lang = merchant.language || 'ur';
    return sendTextMessage(
      getSenderRecipient(merchant),
      lang === 'en'
        ? "I didn't quite catch that — try 'help' to see all commands or 'order' to log a sale."
        : "معذرت، بات سمجھ نہیں آئی — تمام کمانڈز دیکھنے کے لیے 'help' لکھیں یا آرڈر کے لیے 'order' بولیں یا لکھیں۔"
    );
  }

  const detectedLanguage = /[\u0600-\u06FF]/.test(text) ? 'ur' : (merchant.language || 'ur');
  return await routeParsedCommand(merchant, { ...intent, language: detectedLanguage, incomingMessageId: rawMessage?.id, rawMessage }, 'text');
}

/** Voice note: download audio, transcribe + parse via agent/, then run the command. */
async function handleVoiceNote(merchant, mediaId, rawMessage = null) {
  try {
    const { buffer, mimeType } = await downloadMedia(mediaId);
    const intent = await transcribeAndParse(buffer, mimeType, merchant.language, merchant);
    const effectiveLanguage = intent.detectedLanguage || merchant.language || 'ur';
    const transcript = intent.transcript || intent.rawText || '';

    // Reject voice notes attempting to add staff — must be text
    if (/(?:add\s+staff|add\s+assistant|اسٹاف\s*شامل|نیا\s*اسٹاف|ملازم\s*شامل|اسٹاف\s*ایڈ)/i.test(transcript)) {
      const isUrdu = effectiveLanguage === 'ur';
      const msg = isUrdu
        ? 'Assalam o Alikum! ⚠️ سیکیورٹی اور درستگی کے لیے اسٹاف شامل کرنے کی کمانڈ وائس نوٹ کے بجائے ٹیکسٹ میسج میں نام اور فون نمبر لکھ کر بھیجیں (جیسے: "add staff Hamza 03001234567")۔'
        : 'Assalam o Alikum! ⚠️ For security and accuracy, please add staff using a text message with name and phone number (e.g. "add staff Hamza 03001234567") instead of a voice note.';
      return sendTextMessage(getSenderRecipient(merchant), msg);
    }

    // 0. Active Pending New Item reply from VN
    const pendingNewItem = await ConversationState.findOne({
      whatsappNumber: getSenderRecipient(merchant),
      flow: 'pending_new_item',
    });
    if (pendingNewItem) {
      const idleMs = Date.now() - new Date(pendingNewItem.updatedAt).getTime();
      if (idleMs > 30 * 60 * 1000) {
        await ConversationState.deleteOne({ _id: pendingNewItem._id });
      } else {
        return await handlePendingNewItemReply(merchant, transcript, 'voice', pendingNewItem, rawMessage);
      }
    }

    // 1. Fast-path voice gender switch from VN
    const genderChoice = parseVoiceGenderChange(transcript);
    if (genderChoice) {
      return await handleVoiceGenderChange(merchant, genderChoice, 'voice');
    }

    // 1b. Fast-path khata creation / statement report from VN (before settle & inquiry, which share their words)
    const khataCreateMatch = parseKhataCreateHeuristic(transcript);
    if (khataCreateMatch) {
      return await handleKhataCreate(merchant, khataCreateMatch.customerName, khataCreateMatch.phone || (khataCreateMatch.invalidPhone ? 'invalid' : null), 'voice');
    }
    const khataReportMatch = parseKhataReportHeuristic(transcript);
    if (khataReportMatch) {
      return await handleKhataReport(merchant, khataReportMatch.customerName, 'voice');
    }

    // 2. Fast-path Khata settlement from VN
    const settleMatch = parseKhataSettleHeuristic(transcript);
    if (settleMatch) {
      return await handleKhataSettle(merchant, settleMatch.customerName, settleMatch.amount, 'voice');
    }

    // 3. Fast-path Khata inquiry from VN
    const inquiryMatch = parseKhataInquiryHeuristic(transcript);
    if (inquiryMatch) {
      return await handleKhataInquiry(merchant, inquiryMatch.customerName, 'voice');
    }

    return routeParsedCommand(merchant, { ...intent, language: effectiveLanguage, incomingMessageId: rawMessage?.id, rawMessage }, 'voice');
  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data ? JSON.stringify(err.response.data) : '';
    console.error(
      `voice note handling failed for ${merchant.whatsappNumber}: ${err.message}${status ? ` (status ${status})` : ''}${body ? ` ${body}` : ''}`
    );
    return replyToMerchant(merchant, spokenPhrases.voiceProcessingError(merchant.language), 'voice');
  }
}

/**
 * Runs one parsed Qwen command. Both input paths (typed text and voice)
 * converge here on the identical structured command shape, so downstream
 * handling never knows which path produced it (per the architecture guide).
 */
async function routeParsedCommand(merchant, intent, source) {
  const effectiveLanguage = intent.language || merchant.language || 'ur';

  // Check if we are resuming a cut-off voice note
  const cutState = await ConversationState.findOne({
    whatsappNumber: getSenderRecipient(merchant),
    flow: 'cut_voice_note'
  });

  if (cutState && intent.type === 'log_sale') {
    const pendingItems = cutState.data.pendingItems || [];
    const newItems = intent.items || [];
    
    // Merge logic: deduplicate overlapping tail items or just concatenate
    // Simple approach: add new items. If the first new item matches the last pending item,
    // assume it's a correction/completion of that item (e.g. "and 5..." -> "5 sugar")
    for (const newItem of newItems) {
      const matchIdx = pendingItems.findIndex(p => p.name.toLowerCase() === newItem.name.toLowerCase());
      if (matchIdx !== -1) {
        pendingItems[matchIdx].quantity = newItem.quantity; // Overwrite quantity for duplicates
      } else {
        pendingItems.push(newItem);
      }
    }
    
    intent.items = pendingItems;
    intent.paymentMethod = intent.paymentMethod || cutState.data.paymentMethod || merchant.defaultPaymentMethod || 'cash';
    intent.amount = intent.amount || cutState.data.amount;
    
    await ConversationState.deleteOne({ _id: cutState._id });
    
    // If the new message is ALSO incomplete, we stash the updated merged list!
    // This will be caught by the standard isIncomplete check below.
  } else if (cutState) {
    // If they sent something else (e.g. check stock) while we were waiting, abort the cut-off flow
    await ConversationState.deleteOne({ _id: cutState._id });
  }

  if (intent.type === 'log_sale') {
    if (intent.isIncomplete && intent.items?.length > 0) {
      await ConversationState.findOneAndUpdate(
        { whatsappNumber: getSenderRecipient(merchant) },
        { 
          merchantId: merchant._id, 
          flow: 'cut_voice_note', 
          step: 'awaiting_completion', 
          data: { pendingItems: intent.items, paymentMethod: intent.paymentMethod || merchant.defaultPaymentMethod || 'cash', amount: intent.amount }
        },
        { upsert: true }
      );
      
      const itemsList = intent.items.map(i => `• ${i.name} x ${i.quantity}`).join('\n');
      const text = effectiveLanguage === 'ur'
        ? `یہ یہ آئٹمز سمجھ آ گئے ہیں:\n${itemsList}\n\nآواز کٹ گئی تھی، برائے مہربانی بقیہ سامان دوبارہ بول دیں یا لکھ دیں۔`
        : `I got these items so far:\n${itemsList}\n\nThe audio cut off, please repeat or type the rest of the items.`;
        
      const spoken = effectiveLanguage === 'ur'
        ? 'آواز کٹ گئی تھی۔ برائے مہربانی بقیہ سامان دوبارہ بول دیں یا لکھ دیں۔'
        : 'The audio cut off, please repeat or type the rest of the items.';
      return replyToMerchant(merchant, { spoken, text }, source, effectiveLanguage);
    }

    return createOrderViaCrm(merchant, {
      type: 'log_sale',
      merchantId: merchant._id,
      items: intent.items,
      paymentMethod: intent.paymentMethod || merchant.defaultPaymentMethod || 'cash',
      customerName: intent.customerName,
      amount: intent.amount,
      source,
      language: effectiveLanguage,
      incomingMessageId: intent.incomingMessageId,
    });
  }

  if (intent.type === 'create_khata') {
    return handleKhataCreate(merchant, intent.customerName, intent.phone || (intent.invalidPhone ? 'invalid' : null), source);
  }

  if (intent.type === 'khata_report') {
    return handleKhataReport(merchant, intent.customerName, source);
  }

  if (intent.type === 'settle_khata') {
    return handleKhataSettle(merchant, intent.customerName, intent.amount, source);
  }

  if (intent.type === 'check_khata') {
    return handleKhataInquiry(merchant, intent.customerName, source);
  }

  if (intent.type === 'return_order') {
    return handleReturnOrderViaWhatsApp(merchant, intent, source, intent.rawMessage);
  }

  if (intent.type === 'exchange_order') {
    return handleExchangeOrderViaWhatsApp(merchant, intent, source, intent.rawMessage);
  }

  if (intent.type === 'stock_guide') {
    const phrases = spokenPhrases.stockGuide(effectiveLanguage);
    return replyToMerchant(merchant, phrases, source, effectiveLanguage);
  }

  if (intent.type === 'update_stock') {
    const phrases = await restockItemViaCrm(merchant, {
      type: 'update_stock',
      merchantId: merchant._id,
      item: intent.item,
      items: intent.items || (intent.item ? [intent.item] : []),
      source,
      language: effectiveLanguage,
    });

    if (phrases?.requiresDetails) {
      await ConversationState.findOneAndUpdate(
        { whatsappNumber: getSenderRecipient(merchant) },
        {
          merchantId: merchant._id,
          flow: 'pending_new_item',
          step: 'awaiting_price_unit',
          data: {
            item: phrases.item,
            missing: phrases.missing,
            language: effectiveLanguage,
          },
        },
        { upsert: true }
      );
      return replyToMerchant(merchant, { text: phrases.text, spoken: phrases.spoken }, source, effectiveLanguage);
    }

    return replyToMerchant(merchant, phrases, source, effectiveLanguage);
  }

  if (intent.type === 'check_stock') {
    const phrases = await checkStockViaCrm(merchant, {
      type: 'check_stock',
      merchantId: merchant._id,
      item: intent.item,
      source,
      language: effectiveLanguage,
    });
    return replyToMerchant(merchant, phrases, source, effectiveLanguage);
  }

  if (intent.type === 'unsupported_workflow') {
    return sendTextMessage(getSenderRecipient(merchant), workflowRejectionText({ code: 'UNSUPPORTED_REQUEST' }, effectiveLanguage));
  }

  if (intent.type === 'create_workflow') {
    return proposeWorkflow(merchant, {
      merchantId: merchant._id,
      trigger: intent.trigger,
      condition: intent.condition,
      action: intent.action,
      rawInstruction: intent.rawInstruction,
      source,
      language: effectiveLanguage,
    });
  }

  if (intent.type === 'generate_report') {
    return handleReportRequest(merchant, intent.reportType, source, effectiveLanguage);
  }

  if (intent.type === 'greeting') {
    const greetingPhrases = effectiveLanguage === 'en'
      ? {
          spoken: 'Hello! How can I help you today? You can log a sale, add stock, or type help.',
          text: 'Hello! How can I help? Speak or type your sale (e.g. "2 rice cash"), add stock (e.g. "add 50 rice"), or type *help* for all commands.',
        }
      : {
          spoken: 'وعلیکم السلام! فرمائیے، کیا مدد کروں؟ آپ بول کر سیل درج کر سکتے ہیں، نیا مال شامل کر سکتے ہیں، یا ہیلپ لکھیں۔',
          text: 'وعلیکم السلام! فرمائیے، کیا مدد کروں؟ آپ بول کر سیل درج کر سکتے ہیں، نیا مال شامل کر سکتے ہیں، یا تمام کمانڈز کے لیے *help* لکھیں۔',
        };
    return replyToMerchant(merchant, greetingPhrases, source, effectiveLanguage);
  }

  return replyToMerchant(merchant, spokenPhrases.unrecognizedIntent(effectiveLanguage), source, effectiveLanguage);
}

async function handleReportRequest(merchant, reportType, source, language) {
  return deliverReport(merchant, reportType, language);
}

// ---------------------------------------------------------------------------
// Guided order flow: item picker → quantity → payment method → confirm
// ---------------------------------------------------------------------------
/** Starts the guided flow: saves state and sends the first item-picker page. */
async function startGuidedOrder(merchant) {
  const itemCount = await InventoryItem.countDocuments({ merchantId: merchant._id });
  if (!itemCount) {
    return sendTextMessage(
      getSenderRecipient(merchant),
      'Your stock list is empty — add items from the dashboard first, or just tell me the sale directly (e.g. "2 items, cash, 1500").'
    );
  }

  await ConversationState.findOneAndUpdate(
    { whatsappNumber: getSenderRecipient(merchant) },
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
  const rows = items.map((i) => {
    let description = '';
    if (i.quantity <= 0) {
      description = `⚠️ Out of Stock (0)`;
    } else {
      description = `Stock: ${i.quantity} ${i.unit || ''} | Rs. ${i.price ?? 0}`;
    }
    return { id: `item_${i._id}`, title: i.name.slice(0, 24), description: description.slice(0, 72) };
  });
  const pages = paginateRows(rows);
  const safePage = Math.max(0, Math.min(page, pages.length - 1));
  const hasMore = safePage < pages.length - 1;

  return sendInteractiveList(getSenderRecipient(merchant), 'What did you sell?', 'Pick item', [
    {
      title: 'Your stock',
      rows: hasMore ? [...pages[safePage], { id: 'show_more', title: 'Show more' }] : pages[safePage],
    },
  ]);
}

// Escape-hatch words for the guided flow. Prefixes catch typos like "cancelll"
// — "sto" alone is skipped so words like "stock" never trigger a cancel.
const CANCEL_WORDS = ['cancel', 'stop', 'quit', 'exit', 'khatam', 'band karo', 'منسوخ', 'ختم'];
function isCancelText(raw) {
  const s = raw?.trim().toLowerCase();
  if (!s) return false;
  return CANCEL_WORDS.includes(s) || s.startsWith('canc') || s.startsWith('stop');
}

/** Advances an in-flight guided order one step, driven by ConversationState.step. */
async function continueGuidedOrder(merchant, message, state) {
  const listId = message.interactive?.list_reply?.id;
  const buttonId = message.interactive?.button_reply?.id;

  // Escape hatch — typing "cancel"/"stop" (or near-misses) abandons the
  // in-flight order instead of trapping the merchant in the flow.
  const cancelCandidate = message.text?.body || message.interactive?.button_reply?.title;
  if (isCancelText(cancelCandidate)) {
    await ConversationState.deleteOne({ _id: state._id });
    const cancelMsg = merchant.language === 'ur'
      ? 'کوئی مسئلہ نہیں — آرڈر منسوخ کر دیا گیا ہے۔ نیا آرڈر درج کرنے کے لیے "order" لکھیں۔'
      : 'No problem — order cancelled. Send "order" whenever you want to log another sale.';
    return sendTextMessage(getSenderRecipient(merchant), cancelMsg);
  }

  switch (state.step) {
    case 'awaiting_item': {
      if (listId === 'show_more') {
        const nextPage = (state.data?.page ?? 0) + 1;
        const updatedData = { ...state.data, page: nextPage };
        await ConversationState.findByIdAndUpdate(state._id, { $set: { data: updatedData } });
        return sendItemPickerPage(merchant, nextPage);
      }
      if (!listId?.startsWith('item_')) {
        // Merchants type the item name more often than they tap the list —
        // match free text against stock ("daal maash" or "2 daal maash").
        const raw = message.text?.body?.trim();
        if (!raw) {
          return sendTextMessage(getSenderRecipient(merchant), 'Please pick an item from the list — or just type its name.');
        }
        const qtyMatch = raw.match(/^(\d+)\s+(.+)$/);
        const saidName = qtyMatch ? qtyMatch[2] : raw;
        const ranked = await findSimilarInventoryItems(merchant._id, saidName, { limit: 2, minScore: 0.6 });
        const best = ranked[0];
        const clearMatch = ranked.length === 1 || (ranked.length === 2 && ranked[0].score - ranked[1].score >= 0.15);

        if (best && clearMatch) {
          if (best.item.quantity <= 0) {
            const msg = merchant.language === 'ur'
              ? `⚠️ معذرت، "${best.item.name}" کا اسٹاک ختم ہے (دستیاب: 0)۔ برائے مہربانی کوئی اور چیز منتخب کریں یا "cancel" لکھیں۔`
              : `⚠️ Sorry, "${best.item.name}" is out of stock (Available: 0). Please pick something else or send "cancel".`;
            return sendTextMessage(getSenderRecipient(merchant), msg);
          }
          
          const typedQty = qtyMatch ? parseInt(qtyMatch[1], 10) : null;
          const updatedData = {
            ...state.data,
            itemId: best.item._id.toString(),
            itemName: best.item.name,
            price: best.item.price,
          };
          if (typedQty && typedQty > 0) {
            updatedData.quantity = typedQty;
            await ConversationState.findByIdAndUpdate(state._id, {
              $set: { step: 'awaiting_payment_method', data: updatedData },
            });
            return sendPaymentMethodPicker(merchant);
          }
          await ConversationState.findByIdAndUpdate(state._id, {
            $set: { step: 'awaiting_quantity', data: updatedData },
          });
          const qtyPrompt = merchant.language === 'ur'
            ? `آپ نے کتنے ${best.item.name} فروخت کیے؟`
            : `How many ${best.item.name} did you sell?`;
          return sendTextMessage(getSenderRecipient(merchant), qtyPrompt);
        }

        if (ranked.length > 1) {
          const names = ranked.map((r) => `"${r.item.name}"`).join(' or ');
          await sendTextMessage(getSenderRecipient(merchant), `Did you mean ${names}? Type the full name — or pick from the list below.`);
          return sendItemPickerPage(merchant, state.data?.page ?? 0);
        }

        return sendTextMessage(
          getSenderRecipient(merchant),
          `I couldn't match "${saidName}" — tap an item from the list, or type its exact name. Send "cancel" to exit.`
        );
      }
      
      const item = await InventoryItem.findById(listId.replace('item_', ''));
      if (!item) return sendTextMessage(getSenderRecipient(merchant), "Couldn't find that item — try again.");

      if (item.quantity <= 0) {
        const msg = merchant.language === 'ur'
          ? `⚠️ معذرت، "${item.name}" کا اسٹاک ختم ہے (دستیاب: 0)۔ برائے مہربانی کوئی اور چیز منتخب کریں یا "cancel" لکھیں۔`
          : `⚠️ Sorry, "${item.name}" is out of stock (Available: 0). Please pick something else or send "cancel".`;
        return sendTextMessage(getSenderRecipient(merchant), msg);
      }

      const updatedData = {
        ...state.data,
        itemId: item._id.toString(),
        itemName: item.name,
        price: item.price, // stashed so finalize can compute the total without a re-fetch
      };
      await ConversationState.findByIdAndUpdate(state._id, {
        $set: { step: 'awaiting_quantity', data: updatedData },
      });
      const qtyPrompt = merchant.language === 'ur'
        ? `آپ نے کتنے ${item.name} فروخت کیے؟`
        : `How many ${item.name} did you sell?`;
      return sendTextMessage(getSenderRecipient(merchant), qtyPrompt);
    }

    case 'awaiting_quantity': {
      // 1. Direct payment button or payment method name provided
      const payButtonId = buttonId?.startsWith('pay_') ? buttonId : (listId?.startsWith('pay_') ? listId : null);
      const paymentAttempt = payButtonId
        ? payButtonId.replace('pay_', '')
        : normalizePaymentMethod(message.text?.body?.trim() || message.interactive?.button_reply?.title?.trim());

      if (paymentAttempt) {
        state.data = {
          ...(state.data || {}),
          quantity: state.data?.quantity || 1,
          paymentMethod: paymentAttempt,
        };
        return finalizeGuidedOrder(merchant, state);
      }

      // 2. Parse quantity (and optional trailing payment method, e.g. "5 cash")
      const raw = (message.text?.body?.trim() || message.interactive?.button_reply?.title?.trim() || '');
      const numMatch = raw.match(/\d+/);
      const quantity = numMatch ? parseInt(numMatch[0], 10) : parseInt(raw, 10);

      // Check if message also included payment method (e.g. "2 easypaisa", "5 نقد")
      const trailingText = raw.replace(/\d+/, '').trim();
      const inlinePayment = normalizePaymentMethod(trailingText);

      if (quantity && quantity > 0) {
        if (inlinePayment) {
          state.data = {
            ...(state.data || {}),
            quantity,
            paymentMethod: inlinePayment,
          };
          return finalizeGuidedOrder(merchant, state);
        }

        const updatedData = { ...(state.data || {}), quantity };
        await ConversationState.findByIdAndUpdate(state._id, {
          $set: { step: 'awaiting_payment_method', data: updatedData },
        });
        return sendPaymentMethodPicker(merchant);
      }

      // If neither quantity nor payment method matched:
      const errorMsg = merchant.language === 'ur'
        ? 'برائے مہربانی درست تعداد درج کریں (مثلاً 5 یا 45) یا ختم کرنے کے لیے "cancel" لکھیں۔'
        : 'Please send a valid number (e.g. 5 or 45). Send "cancel" to restart.';
      return sendTextMessage(getSenderRecipient(merchant), errorMsg);
    }

    case 'awaiting_payment_method': {
      const allowedMethods = (merchant.acceptedPaymentMethods && merchant.acceptedPaymentMethods.length > 0)
        ? merchant.acceptedPaymentMethods
        : DEFAULT_ACCEPTED_PAYMENT_METHODS;

      let paymentMethod = null;
      const payButtonId = buttonId?.startsWith('pay_') ? buttonId : (listId?.startsWith('pay_') ? listId : null);
      if (payButtonId) {
        paymentMethod = payButtonId.replace('pay_', '');
      }

      if (!paymentMethod) {
        const typed = message.text?.body?.trim() || message.interactive?.button_reply?.title?.trim();
        const candidate = normalizePaymentMethod(typed);
        if (candidate) {
          paymentMethod = candidate;
        } else if (typed) {
          // If merchant replied with 1, 2, 3 corresponding to options
          const num = parseInt(typed, 10);
          if (!isNaN(num) && num >= 1 && num <= allowedMethods.length) {
            paymentMethod = allowedMethods[num - 1];
          }
        }
      }

      if (!paymentMethod) {
        const rawLower = (message.text?.body || message.interactive?.button_reply?.title || '').toLowerCase().trim();
        if (rawLower.includes('cash') || rawLower.includes('naqad') || rawLower.includes('نقد') || rawLower.includes('روپے')) {
          paymentMethod = 'cash';
        } else if (rawLower.includes('easy') || rawLower.includes('ایزی')) {
          paymentMethod = 'easypaisa';
        } else if (rawLower.includes('jazz') || rawLower.includes('جاز')) {
          paymentMethod = 'jazzcash';
        }
      }

      if (!paymentMethod) {
        const optionsList = allowedMethods
          .map((m) => (merchant.language === 'ur' ? getPaymentMethodDetails(m)?.nameUrdu : getPaymentMethodDetails(m)?.name) || m)
          .join('، ');
        const prompt = merchant.language === 'ur'
          ? `برائے مہربانی ادائیگی کا طریقہ منتخب کریں: ${optionsList}`
          : `Please choose an accepted payment method: ${optionsList}`;
        return sendTextMessage(getSenderRecipient(merchant), prompt);
      }

      state.data = { ...(state.data || {}), paymentMethod };
      return finalizeGuidedOrder(merchant, state);
    }

    default: {
      await ConversationState.deleteOne({ _id: state._id });
      return sendTextMessage(getSenderRecipient(merchant), 'Something went wrong — let\'s start over. Type "order" to try again.');
    }
  }
}

/** Sends interactive buttons or options for merchant's accepted payment methods. */
async function sendPaymentMethodPicker(merchant) {
  const allowed = (merchant.acceptedPaymentMethods && merchant.acceptedPaymentMethods.length > 0)
    ? merchant.acceptedPaymentMethods
    : DEFAULT_ACCEPTED_PAYMENT_METHODS;

  const buttons = allowed.slice(0, 3).map((id) => {
    const details = getPaymentMethodDetails(id);
    const title = (merchant.language === 'ur' ? details?.nameUrdu : details?.name) || id;
    return {
      id: `pay_${id}`,
      title: title.slice(0, 20),
    };
  });

  if (allowed.length <= 3) {
    const prompt = merchant.language === 'ur' ? 'ادائیگی کس طریقے سے ہوئی؟' : 'How was it paid?';
    return sendInteractiveButtons(getSenderRecipient(merchant), prompt, buttons);
  }

  const listRows = allowed.map((id) => {
    const details = getPaymentMethodDetails(id);
    const title = (merchant.language === 'ur' ? details?.nameUrdu : details?.name) || id;
    return {
      id: `pay_${id}`,
      title: title.slice(0, 20)
    };
  });

  const prompt = merchant.language === 'ur' ? 'ادائیگی کس طریقے سے ہوئی؟' : 'How was it paid?';
  return sendInteractiveList(getSenderRecipient(merchant), prompt, 'Select payment method', [{ title: 'Payment Methods', rows: listRows }]);
}

/** Logs the completed guided order via crm/ and clears the flow state. */
async function finalizeGuidedOrder(merchant, state) {
  const data = state?.data || {};
  let { itemId, itemName, quantity, paymentMethod, price } = data;

  const safeQty = Number(quantity) > 0 ? Number(quantity) : 1;
  const safeMethod = paymentMethod || 'cash';
  let safeName = itemName;
  let safePrice = price;

  if (!safeName && itemId) {
    try {
      const itm = await InventoryItem.findById(itemId);
      if (itm) {
        safeName = itm.name;
        if (safePrice == null) safePrice = itm.price;
      }
    } catch (err) {
      console.error('Error finding item in finalizeGuidedOrder:', err.message);
    }
  }

  await createOrderViaCrm(merchant, {
    type: 'log_sale',
    merchantId: merchant._id,
    item: { name: safeName || 'Item', quantity: safeQty, inventoryItemId: itemId },
    paymentMethod: safeMethod,
    // Guided flow never asks for a price — derive it from the stock list's
    // unit price; null if the merchant never set one.
    amount: safePrice != null ? safePrice * safeQty : null,
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
export async function createOrderViaCrm(merchant, command) {
  const source = command.source || 'text';
  const language = command.language || merchant.language || 'ur';

  if (merchant?._staffMember) {
    command.staffName = merchant._staffMember.name;
    command.staffPhone = merchant._staffMember.whatsappNumber;
  }

  // Udhaar sales go to an EXISTING khata only. A khata is opened explicitly ("<name> ka khata bnao
  // phone ...") and is never created as a side effect of a sale.
  if (command.paymentMethod === 'udhaar') {
    const rawName = (command.customerName || '').trim();
    if (!rawName) {
      return replyToMerchant(merchant, spokenPhrases.khataNameRequired(language), source);
    }

    if (!command._skipCustomerDisambiguation) {
      const match = await findCustomerByFuzzyName(merchant._id, rawName, { strict: true });
      if (match) {
        command.customerName = match.name; // canonical stored name, so the order lookup can't miss
      } else {
        // No exact khata. If a similar one exists ("soban" vs "soban khan"), let the merchant confirm.
        const cleanName = rawName.toLowerCase();
        const normalizedBase = cleanName.replace(/\b(bhai|sahab|sahib|sb|khan|ji|janab)\b/gi, '').trim();
        if (normalizedBase.length >= 3) {
          const allCust = await Customer.find({ merchantId: merchant._id });
          const candidate = allCust.find((c) => {
            const cClean = c.name.toLowerCase().replace(/\b(bhai|sahab|sahib|sb|khan|ji|janab)\b/gi, '').trim();
            return cClean === normalizedBase || cClean.includes(normalizedBase) || normalizedBase.includes(cClean);
          });

          if (candidate) {
            return await offerCustomerDisambiguation(merchant, command, candidate);
          }
        }

        return replyToMerchant(merchant, spokenPhrases.khataNotFound(language, { customerName: rawName }), source);
      }
    }
  }

  try {
    const order = await createOrder(command);
    const orderNo = order?.orderNumber || '';
    const phrases = spokenPhrases.orderLogged(language, {
      items: command.items,
      paymentMethod: command.paymentMethod,
      customerName: command.customerName,
      orderNo,
    });
    const sendRes = await replyToMerchant(merchant, phrases, source);
    if (order && sendRes?.messages?.[0]?.id) {
      order.confirmationMessageId = sendRes.messages[0].id;
      await order.save().catch(() => {});
    }
    return sendRes;
  } catch (err) {
    const message = err?.message ?? '';

    // Backstop: the order service re-checks the khata right before touching stock.
    if (message.startsWith('KHATA_NOT_FOUND:')) {
      return replyToMerchant(merchant, spokenPhrases.khataNotFound(language, { customerName: command.customerName }), source);
    }
    if (message.startsWith('KHATA_NAME_REQUIRED:')) {
      return replyToMerchant(merchant, spokenPhrases.khataNameRequired(language), source);
    }

    if (message.startsWith('ITEM_NOT_FOUND:')) {
      const match = message.match(/ITEM_NOT_FOUND: Cannot find '(.*)' in inventory\./);
      const missingName = match ? match[1] : command.items?.[0]?.name;
      return offerItemDisambiguation(merchant, command, missingName);
    }

    if (message.startsWith('INSUFFICIENT_STOCK:')) {
      const detail = message.slice('INSUFFICIENT_STOCK:'.length).trim();
      const match = message.match(/INSUFFICIENT_STOCK: (.*) Tried to deduct/);
      const itemName = match ? match[1] : command.items?.[0]?.name;
      const phrases = spokenPhrases.insufficientStock(language, { detail, itemName });
      return replyToMerchant(merchant, phrases, source);
    }

    console.error('createOrder failed:', message);
    const phrases = spokenPhrases.genericError(language);
    return replyToMerchant(merchant, phrases, source);
  }
}

/**
 * The merchant's item name didn't match their stock list. Instead of a dead
 * end, offer the closest candidates as buttons — "Did you mean Daal Maash?"
 * Candidates come from string similarity first, then the LLM (handles
 * chawal/rice/چاول and Urdu-script names). The pending command is stashed in
 * ConversationState so the button tap can finish the sale.
 */
async function offerItemDisambiguation(merchant, command, missingItemName = '') {
  const source = command.source || 'text';
  const language = command.language || merchant.language || 'ur';
  const saidName = missingItemName || command.items?.[0]?.name || '';

  let ranked = await findSimilarInventoryItems(merchant._id, saidName, { limit: 2, minScore: 0.35 });

  if (!ranked.length) {
    const inventory = await InventoryItem.find({ merchantId: merchant._id }).limit(100);
    const resolved = await resolveItemName(saidName, inventory.map((i) => i.name));
    if (resolved) {
      ranked = inventory
        .filter((i) => i.name.toLowerCase() === resolved.toLowerCase())
        .map((item) => ({ item, score: 1 }));
    }
  }

  if (!ranked.length) {
    const phrases = spokenPhrases.itemNotFound(language, { saidName });
    return replyToMerchant(merchant, phrases, source);
  }

  // WhatsApp caps reply buttons at 3: two candidates + an escape.
  const buttons = ranked
    .slice(0, 2)
    .map(({ item }) => ({ id: `pick_${item._id}`, title: item.name.slice(0, 20) }));
  buttons.push({ id: 'pick_none', title: 'None of these' });

  const targetPhone = getSenderRecipient(merchant);

  await ConversationState.findOneAndUpdate(
    { whatsappNumber: targetPhone },
    { merchantId: merchant._id, flow: 'item_disambiguation', step: 'awaiting_choice', data: { command, missingItemName: saidName } },
    { upsert: true }
  );

  const candidateNames = ranked.slice(0, 2).map((r) => r.item.name);
  const phrases = spokenPhrases.itemDisambiguation(language, { saidName, candidates: candidateNames });

  // If source was voice, send the spoken question first
  if (shouldReplyWithVoice(merchant, source)) {
    await sendVoiceReply(targetPhone, {
      spokenText: phrases.spoken,
      language,
      alsoSendText: false,
    });
  }

  return sendInteractiveButtons(
    targetPhone,
    phrases.text,
    buttons
  );
}

/** Finishes (or declines) a sale after the merchant taps a "did you mean?" button. */
async function handleDisambiguationReply(merchant, buttonId) {
  const targetPhone = getSenderRecipient(merchant);
  const state = await ConversationState.findOne({
    whatsappNumber: targetPhone,
    flow: 'item_disambiguation',
  });
  if (!state) {
    return sendTextMessage(targetPhone, "Sorry, that choice expired — please send the sale again.");
  }
  await ConversationState.deleteOne({ _id: state._id });

  if (buttonId === 'pick_none') {
    return sendTextMessage(
      targetPhone,
      'No problem — sale not logged. Send "order" to pick from your stock list, or add the item from the dashboard.'
    );
  }

  const item = await InventoryItem.findById(buttonId.replace('pick_', ''));
  if (!item) {
    return sendTextMessage(targetPhone, "Couldn't find that item anymore — please send the sale again.");
  }

  const command = state.data?.command ?? {};
  const missingName = state.data?.missingItemName;

  let items = [...(command.items || [])];
  
  if (items.length > 0) {
    const idx = items.findIndex(i => i.name === missingName);
    if (idx !== -1) {
      items[idx] = { ...items[idx], name: item.name, inventoryItemId: item._id.toString() };
    } else {
      items[0] = { ...items[0], name: item.name, inventoryItemId: item._id.toString() };
    }
  } else {
    items = [{ ...(command.item ?? {}), name: item.name, inventoryItemId: item._id.toString() }];
  }

  return createOrderViaCrm(merchant, {
    ...command,
    items,
  });
}

/**
 * Prompts the merchant via WhatsApp interactive buttons to confirm whether a customer
 * is the existing customer with matching name or a new distinct customer.
 */
async function offerCustomerDisambiguation(merchant, command, candidate) {
  const source = command.source || 'text';
  const language = command.language || merchant.language || 'ur';
  const targetPhone = getSenderRecipient(merchant);

  await ConversationState.findOneAndUpdate(
    { whatsappNumber: targetPhone },
    {
      merchantId: merchant._id,
      flow: 'customer_disambiguation',
      step: 'awaiting_customer_choice',
      data: { command, candidateId: candidate._id.toString(), candidateName: candidate.name },
    },
    { upsert: true }
  );

  const phrases = spokenPhrases.customerDisambiguationPrompt(language, {
    candidateName: candidate.name,
    currentBalance: candidate.balance,
  });

  const buttons = [
    { id: `cust_same_${candidate._id}`, title: `وہی (${candidate.name})`.slice(0, 20) },
    { id: 'cust_new', title: (language === 'ur' ? 'نیا گاہک' : 'New Customer').slice(0, 20) },
  ];

  if (shouldReplyWithVoice(merchant, source)) {
    await sendVoiceReply(targetPhone, {
      spokenText: phrases.spoken,
      language,
      alsoSendText: false,
    });
  }

  return sendInteractiveButtons(targetPhone, phrases.text, buttons);
}

/**
 * Handles button tap response for customer disambiguation.
 */
async function handleCustomerDisambiguationReply(merchant, buttonId) {
  const targetPhone = getSenderRecipient(merchant);
  const state = await ConversationState.findOne({
    whatsappNumber: targetPhone,
    flow: 'customer_disambiguation',
  });
  if (!state) {
    return sendTextMessage(targetPhone, "Sorry, that choice expired — please send the sale again.");
  }
  await ConversationState.deleteOne({ _id: state._id });

  const command = state.data?.command ?? {};
  const language = command.language || merchant.language || 'ur';

  // "New customer" no longer opens a khata on the spot — a khata needs a phone number, so
  // tell the merchant how to create it instead of recording the sale against nobody.
  if (buttonId === 'cust_new') {
    return replyToMerchant(
      merchant,
      spokenPhrases.khataNotFound(language, { customerName: command.customerName }),
      command.source || 'text'
    );
  }

  command._skipCustomerDisambiguation = true;
  command.customerName = state.data?.candidateName || command.customerName;

  return createOrderViaCrm(merchant, command);
}

/**
 * Handles processing an order return requested through WhatsApp voice or text.
 */
async function handleReturnOrderViaWhatsApp(merchant, intent, source = 'text', rawMessage = null) {
  const language = merchant.language || 'ur';
  const contextId = rawMessage?.context?.id || null;
  const orderNumber = intent.orderNumber || null;
  const itemName = intent.itemName || null;
  const targetAmount = intent.targetAmount || null;

  const order = await findOrderByReference(merchant._id, {
    orderNumber,
    contextId,
    itemName,
    targetAmount,
  });

  if (!order) {
    return replyToMerchant(merchant, spokenPhrases.askReturnOrderNumber(language), source);
  }

  try {
    let returnItems = intent.items;
    if (!returnItems && itemName && order.items?.length > 0) {
      const matched = order.items.find(
        (i) => i.name.toLowerCase().includes(itemName.toLowerCase()) ||
               itemName.toLowerCase().includes(i.name.toLowerCase())
      );
      if (matched) {
        const qty = intent.quantity || (targetAmount && matched.price ? Math.round((targetAmount / matched.price) * 1000) / 1000 : matched.quantity);
        returnItems = [{
          inventoryItemId: matched.inventoryItemId,
          name: matched.name,
          quantity: Math.min(matched.quantity, qty || matched.quantity),
          price: matched.price,
        }];
      }
    }

    const result = await processOrderReturn(merchant._id, {
      orderId: order._id,
      items: returnItems,
      reason: 'WhatsApp return',
    });

    const phrases = spokenPhrases.orderReturned(language, {
      orderNo: result.order.orderNumber,
      returnedItems: result.returnedItems,
      refundAmount: result.refundAmount,
      customerName: result.customer?.name,
      newBalance: result.customer?.balance,
    });

    return replyToMerchant(merchant, phrases, source);
  } catch (err) {
    console.error('WhatsApp return failed:', err.message);
    const errText = language === 'ur'
      ? `❌ واپسی درج نہیں ہو سکی: ${err.message}`
      : `❌ Could not process return: ${err.message}`;
    return replyToMerchant(merchant, errText, source);
  }
}

/**
 * Handles processing an item exchange requested through WhatsApp voice or text.
 */
async function handleExchangeOrderViaWhatsApp(merchant, intent, source = 'text', rawMessage = null) {
  const language = merchant.language || 'ur';
  const contextId = rawMessage?.context?.id || null;
  const orderNumber = intent.orderNumber || null;

  const order = await findOrderByReference(merchant._id, {
    orderNumber,
    contextId,
    itemName: intent.returnItem?.name,
  });
  if (!order) {
    return replyToMerchant(merchant, spokenPhrases.askReturnOrderNumber(language), source);
  }

  try {
    let returnItem = intent.returnItem;
    if (!returnItem && order.items?.length === 1) {
      returnItem = { name: order.items[0].name, quantity: order.items[0].quantity };
    } else if (!returnItem && order.items?.length > 1) {
      returnItem = { name: order.items[0].name, quantity: 1 };
    }

    let newItem = intent.newItem;
    if (!newItem && intent.newItemText) {
      const match = intent.newItemText.match(/^(?:(\d+)\s+)?(.+)$/);
      newItem = {
        quantity: match && match[1] ? parseInt(match[1], 10) : 1,
        name: match ? match[2].trim() : intent.newItemText.trim(),
      };
    }

    if (!newItem || !newItem.name) {
      const askMsg = language === 'ur'
        ? `🔄 آرڈر *#${order.orderNumber}* مل گیا ہے۔ اس کی جگہ گاہک کو کیا نیا سامان دینا ہے؟ برائے مہربانی لکھیں (مثلاً: "is ki jagah 2 daal")۔`
        : `🔄 Found Order *#${order.orderNumber}*. What replacement item should be given? Please specify (e.g. "is ki jagah 2 daal").`;
      return replyToMerchant(merchant, askMsg, source);
    }

    const result = await processOrderExchange(merchant._id, {
      orderId: order._id,
      returnItem,
      newItem,
      reason: 'WhatsApp exchange',
    });

    const phrases = spokenPhrases.orderExchanged(language, {
      orderNo: result.order.orderNumber,
      returnItem: result.returnItem,
      newItem: result.newItem,
      priceDifference: result.priceDifference,
      customerName: result.customer?.name,
      newBalance: result.customer?.balance,
    });

    return replyToMerchant(merchant, phrases, source);
  } catch (err) {
    console.error('WhatsApp exchange failed:', err.message);
    const errText = language === 'ur'
      ? `❌ تبادلہ مکمل نہیں ہو سکا: ${err.message}`
      : `❌ Could not process exchange: ${err.message}`;
    return replyToMerchant(merchant, errText, source);
  }
}

// Codes where the merchant asked for something we can't do at all (vs. a
// fixable detail like a missing time) — those get the full capabilities list.
const WORKFLOW_UNSUPPORTED_CODES = ['UNSUPPORTED_REQUEST', 'UNSUPPORTED_TRIGGER', 'UNSUPPORTED_ACTION', 'UNSUPPORTED_REPORT', 'UNSUPPORTED_OPERATOR'];

function workflowRejectionText(error, language) {
  const reason = explainWorkflowError(error, language);
  return WORKFLOW_UNSUPPORTED_CODES.includes(error.code) ? `${reason}\n\n${capabilitiesText(language)}` : reason;
}

const WORKFLOW_CONFIRM_TTL_MS = 30 * 60 * 1000;

/**
 * Validates a parsed automation, then either saves it straight away (default)
 * or — when the merchant turned on confirmAutomations — reads it back with
 * Save / Cancel buttons and waits for handleWorkflowConfirmReply.
 */
async function proposeWorkflow(merchant, command) {
  const language = command.language || merchant.language || 'ur';
  const targetPhone = getSenderRecipient(merchant);

  try {
    const prepared = await prepareWorkflow(merchant._id, command);
    if (!prepared.ok) {
      return sendTextMessage(targetPhone, workflowRejectionText(prepared.error, language));
    }

    // Voice transcripts get misheard, so a spoken automation is always read
    // back for Save / Cancel instead of being stored silently.
    if (!merchant.confirmAutomations && command.source !== 'voice') {
      return saveWorkflowAndReply(merchant, prepared.value, language);
    }

    await ConversationState.findOneAndUpdate(
      { whatsappNumber: targetPhone },
      { merchantId: merchant._id, flow: 'workflow_confirm', step: 'awaiting_confirmation', data: { workflow: prepared.value, language } },
      { upsert: true }
    );

    const description = describeWorkflow(prepared.value, language);
    const body = language === 'ur'
      ? `کیا یہ آٹومیشن محفوظ کروں؟\n\n⚡ ${description}`
      : `Save this automation?\n\n⚡ ${description}`;
    return sendInteractiveButtons(targetPhone, body, [
      { id: 'wf_save', title: language === 'ur' ? '✅ محفوظ کریں' : '✅ Save' },
      { id: 'wf_cancel', title: language === 'ur' ? '❌ منسوخ' : '❌ Cancel' },
    ]);
  } catch (err) {
    console.error('proposeWorkflow failed:', err.message);
    return replyToMerchant(merchant, spokenPhrases.genericError(language), command.source || 'text');
  }
}

/** Handles the Save / Cancel tap on an automation read-back. */
async function handleWorkflowConfirmReply(merchant, buttonId) {
  const targetPhone = getSenderRecipient(merchant);
  const state = await ConversationState.findOne({ whatsappNumber: targetPhone, flow: 'workflow_confirm' });
  const language = state?.data?.language || merchant.language || 'ur';
  const ur = language === 'ur';

  const expired = !state || Date.now() - new Date(state.updatedAt).getTime() > WORKFLOW_CONFIRM_TTL_MS;
  if (state) await ConversationState.deleteOne({ _id: state._id });
  if (expired) {
    return sendTextMessage(
      targetPhone,
      ur ? 'یہ درخواست پرانی ہو گئی ہے، براہ کرم آٹومیشن دوبارہ بھیجیں۔' : 'That request has expired — please send the automation again.'
    );
  }

  if (buttonId === 'wf_cancel') {
    return sendTextMessage(targetPhone, ur ? 'ٹھیک ہے، آٹومیشن محفوظ نہیں کی گئی۔' : 'Okay, the automation was not saved.');
  }

  return saveWorkflowAndReply(merchant, state.data.workflow, language);
}

/** Stores a validated automation and tells the merchant exactly what was saved. */
async function saveWorkflowAndReply(merchant, workflowInput, language) {
  const targetPhone = getSenderRecipient(merchant);
  try {
    const workflow = await createWorkflow({ ...workflowInput, merchantId: merchant._id });
    emitDashboardUpdate(merchant._id, { type: 'workflow', action: 'create' });
    const phrases = spokenPhrases.workflowCreated(language, { description: describeWorkflow(workflow, language) });
    return replyToMerchant(merchant, phrases, 'text', language);
  } catch (err) {
    if (err instanceof WorkflowValidationError) {
      return sendTextMessage(targetPhone, workflowRejectionText(err.details, language));
    }
    console.error('createWorkflow failed:', err.message);
    return replyToMerchant(merchant, spokenPhrases.genericError(language), 'text', language);
  }
}

/**
 * Handles approve_<orderId> / reject_<orderId> button replies.
 * Looks up the pending Approval by orderId (Ali's button ID convention), calls
 * respond(), and confirms back to the merchant. respond() owns the order status
 * update — nothing else needed here.
 */
async function handleApprovalReply(merchant, buttonId) {
  const targetPhone = getSenderRecipient(merchant);
  const isApprove = buttonId.startsWith('approve_');
  const orderId = buttonId.replace(/^(approve|reject)_/, '');
  const decision = isApprove ? 'approved' : 'rejected';

  try {
    const approval = await findPendingByOrderId(orderId);

    if (!approval) {
      return sendTextMessage(targetPhone, "That order has already been handled.");
    }

    await respondToApproval(approval._id, decision);

    const phrases = spokenPhrases.approvalReply(merchant.language, isApprove);
    return sendTextMessage(targetPhone, phrases.text);
  } catch (err) {
    if (err.message?.startsWith('APPROVAL_NOT_FOUND')) {
      return sendTextMessage(targetPhone, "That order has already been handled.");
    }
    console.error('handleApprovalReply error:', err.message);
    return sendTextMessage(targetPhone, "Couldn't process that — please try from the dashboard.");
  }
}

/** Handles taps on 'Clear Alert' buttons from expiry notifications */
async function handleClearExpiryReply(merchant, buttonId) {
  const targetPhone = getSenderRecipient(merchant);
  try {
    // Format: clearexpiry_{itemId}_{dateToClear}
    const parts = buttonId.split('_');
    if (parts.length < 3) return;
    const itemId = parts[1];
    const dateToClear = parts.slice(2).join('_'); // Just in case there are underscores in date

    const item = await InventoryItem.findOne({ _id: itemId, merchantId: merchant._id });
    if (!item) {
      return sendTextMessage(targetPhone, "Couldn't find that item — it might have been deleted.");
    }

    if (!item.expiryDates.includes(dateToClear)) {
      return sendTextMessage(targetPhone, "That expiry alert was already cleared.");
    }

    item.expiryDates = item.expiryDates.filter(d => d !== dateToClear);
    await item.save();

    emitDashboardUpdate(merchant._id);

    return sendTextMessage(targetPhone, `✅ Alert cleared for *${item.name}* (${dateToClear}).`);
  } catch (err) {
    console.error('handleClearExpiryReply error:', err.message);
    return sendTextMessage(targetPhone, "Couldn't clear the alert — please try from the dashboard.");
  }
}

/**
 * Interactive commands & help guide.
 * Sends the comprehensive categorized guide, followed by quick action buttons.
 */
async function sendHelpCommandsMenu(merchant) {
  const targetPhone = getSenderRecipient(merchant);
  const language = merchant.language || 'ur';
  const phrases = spokenPhrases.helpCommands(language);
  await sendTextMessage(targetPhone, phrases.text);

  const buttonPrompt = language === 'ur'
    ? 'فوری بٹن منتخب کریں یا مزید معلومات دیکھیں:'
    : 'Choose a quick action below:';

  const buttons = language === 'ur'
    ? [
        { id: 'menu_stock', title: '📦 اسٹاک لسٹ' },
        { id: 'menu_reports', title: '📄 رپورٹس' },
        { id: 'menu_settings', title: '⚙️ سیٹنگز' },
      ]
    : [
        { id: 'menu_stock', title: '📦 Stock List' },
        { id: 'menu_reports', title: '📄 PDF Reports' },
        { id: 'menu_settings', title: '⚙️ Settings' },
      ];

  return await sendInteractiveButtons(targetPhone, buttonPrompt, buttons);
}

/**
 * Summarizes the merchant's current inventory with low-stock warnings.
 */
async function sendStockListSummary(merchant) {
  const targetPhone = getSenderRecipient(merchant);
  const summary = await getStockListSummary(merchant);
  const language = merchant.language || 'ur';
  const buttons = language === 'ur'
    ? [
        { id: 'menu_help', title: '📋 مینیو' },
        { id: 'menu_reports', title: '📄 رپورٹس' },
        { id: 'menu_settings', title: '⚙️ سیٹنگز' },
      ]
    : [
        { id: 'menu_help', title: '📋 Menu' },
        { id: 'menu_reports', title: '📄 PDF Reports' },
        { id: 'menu_settings', title: '⚙️ Settings' },
      ];

  if (summary.text.length <= 1000) {
    const res = await sendInteractiveButtons(targetPhone, summary.text, buttons);
    if (!res) await sendTextMessage(targetPhone, summary.text);
  } else {
    await sendTextMessage(targetPhone, summary.text);
    await sendInteractiveButtons(
      targetPhone,
      language === 'ur' ? 'مزید آپشنز منتخب کریں:' : 'Select an option:',
      buttons
    );
  }
}

/**
 * PDF Reports Picker: lets merchant tap to generate Sales, Inventory, or Low Stock reports.
 */
async function sendReportPicker(merchant) {
  const targetPhone = getSenderRecipient(merchant);
  const language = merchant.language || 'ur';
  const bodyText = language === 'ur'
    ? `📄 *پی ڈی ایف رپورٹس مینیو*\n\nجس رپورٹ کی پی ڈی ایف چاہیے نیچے بٹن دبائیں یا نام لکھ کر بھیجیں:\n• سیلز رپورٹ (*"sales report"*)\n• اسٹاک رپورٹ (*"inventory report"*)\n• کم اسٹاک رپورٹ (*"low stock report"*)\n• ایکسپائری رپورٹ (*"expiring report"*)\n• ٹاپ سیلنگ رپورٹ (*"top selling report"*)`
    : `📄 *PDF Reports Menu*\n\nTap a button below or type the report name to receive an instant PDF download in WhatsApp:\n• Sales Report (*"sales report"*)\n• Stock Inventory (*"inventory report"*)\n• Low Stock Alert (*"low stock report"*)\n• Expiring Items (*"expiring report"*)\n• Top Selling (*"top selling report"*)`;

  const buttons = language === 'ur'
    ? [
        { id: 'report_sales', title: '📊 سیلز رپورٹ' },
        { id: 'report_inventory', title: '📦 اسٹاک رپورٹ' },
        { id: 'report_low_stock', title: '⚠️ کم اسٹاک' },
      ]
    : [
        { id: 'report_sales', title: '📊 Sales Report' },
        { id: 'report_inventory', title: '📦 Inventory' },
        { id: 'report_low_stock', title: '⚠️ Low Stock' },
      ];

  const res = await sendInteractiveButtons(targetPhone, bodyText, buttons);
  if (!res) {
    await sendTextMessage(targetPhone, bodyText);
  }
}

/**
 * Profile and Store Settings summary with quick toggle action buttons.
 */
async function sendProfileSettings(merchant) {
  const targetPhone = getSenderRecipient(merchant);
  const language = merchant.language || 'ur';
  const accepted = (merchant.acceptedPaymentMethods || []).map((m) => formatPaymentMethod(m, language)).join(', ') || 'Cash';
  const isVoice = merchant.voiceReplies !== false;
  const confirmsAutomations = !!merchant.confirmAutomations;

  const isMaleVoice = merchant.voiceGender === 'male';

  let text;
  if (language === 'ur') {
    text = `⚙️ *دکان اور پروفائل سیٹنگز*\n\n` +
      `🏪 *دکان کا نام:* ${merchant.businessName || 'مقرر نہیں'}\n` +
      `📍 *مقام:* ${merchant.location || 'مقرر نہیں'}\n` +
      `🏷️ *کاروبار کی قسم:* ${merchant.businessType || 'general'}\n` +
      `🌐 *زبان:* ${merchant.language === 'ur' ? 'اردو (Urdu)' : 'English'}\n` +
      `🔊 *وائس جوابات:* ${isVoice ? 'چالو (On)' : 'بند (Off)'}\n` +
      `🎙️ *وائس اوتار:* ${isMaleVoice ? 'مرد کی آواز (Asad / Guy)' : 'عورت کی آواز (Uzma / Jenny)'}\n` +
      `⚡ *آٹومیشن سے پہلے تصدیق:* ${confirmsAutomations ? 'چالو (On)' : 'بند (Off)'}\n` +
      `💳 *منظور شدہ ادائیگی:* ${accepted}\n\n` +
      `📝 *تبدیل کرنے کا طریقہ:*\n` +
      `• نام بدلیں: *"set name [نیا نام]"*\n` +
      `• مقام بدلیں: *"set location [شہر]"*\n` +
      `• زبان: *"urdu"* یا *"english"*\n` +
      `• آواز بدلیں: *"aurat ki awaz"* یا *"mard ki awaz"*\n` +
      `• وائس: *"voice on"* یا *"voice off"*\n` +
      `• آٹومیشن تصدیق: *"confirm on"* یا *"confirm off"*\n` +
      `• بینک: لکھیں *"banks"*`;
  } else {
    text = `⚙️ *Store Profile & Settings*\n\n` +
      `🏪 *Store Name:* ${merchant.businessName || 'Not set'}\n` +
      `📍 *Location:* ${merchant.location || 'Not set'}\n` +
      `🏷️ *Category:* ${merchant.businessType || 'general'}\n` +
      `🌐 *Language:* ${merchant.language === 'ur' ? 'Urdu' : 'English'}\n` +
      `🔊 *Voice Replies:* ${isVoice ? 'Enabled (On)' : 'Disabled (Off)'}\n` +
      `🎙️ *Voice Avatar:* ${isMaleVoice ? 'Male Voice (Asad / Guy)' : 'Female Voice (Uzma / Jenny)'}\n` +
      `⚡ *Confirm Automations:* ${confirmsAutomations ? 'Enabled (On)' : 'Disabled (Off)'}\n` +
      `💳 *Accepted Payments:* ${accepted}\n\n` +
      `📝 *Quick Change Commands:*\n` +
      `• Rename: *"set name [New Name]"*\n` +
      `• Location: *"set location [City]"*\n` +
      `• Language: *"urdu"* or *"english"*\n` +
      `• Switch Voice: *"female voice"* or *"male voice"*\n` +
      `• Voice: *"voice on"* or *"voice off"*\n` +
      `• Confirm automations: *"confirm on"* or *"confirm off"*\n` +
      `• Bank channels: Type *"banks"*`;
  }

  const buttons = [
    {
      id: isVoice ? 'set_voice_off' : 'set_voice_on',
      title: isVoice ? (language === 'ur' ? '🔇 وائس بند' : '🔇 Voice Off') : (language === 'ur' ? '🔊 وائس آن' : '🔊 Voice On'),
    },
    {
      id: isMaleVoice ? 'set_voice_gender_female' : 'set_voice_gender_male',
      title: isMaleVoice ? (language === 'ur' ? '👩 عورت کی آواز' : '👩 Female Voice') : (language === 'ur' ? '👨 مرد کی آواز' : '👨 Male Voice'),
    },
    {
      id: language === 'ur' ? 'set_lang_en' : 'set_lang_ur',
      title: language === 'ur' ? '🇬🇧 English' : '🇵🇰 اردو',
    },
  ];

  const res = await sendInteractiveButtons(targetPhone, text, buttons);
  if (!res) {
    await sendTextMessage(targetPhone, text);
  }
}

/**
 * Payment Channels & Pakistani Banks list with quick status and toggles.
 */
async function sendPaymentSettings(merchant) {
  const targetPhone = getSenderRecipient(merchant);
  const language = merchant.language || 'ur';
  const all = getAllPaymentMethods();
  const activeSet = new Set(merchant.acceptedPaymentMethods || ['cash']);

  const popularMethods = all.filter((m) => m.isPopular);
  const lines = popularMethods.map((m) => {
    const isActive = activeSet.has(m.id);
    const status = isActive ? '✅' : '❌';
    const name = language === 'ur' ? (m.nameUrdu || m.name) : m.name;
    return `${status} *${name}* (${m.id})`;
  });

  let text;
  if (language === 'ur') {
    text = `💳 *ادائیگی اور بینک کے طریقے (Payment Methods)*\n\n` +
      `موجودہ فعال اور غیر فعال طریقے:\n\n${lines.join('\n')}\n\n` +
      `💡 *طریقہ چالو یا بند کرنے کے لیے لکھیں:*\n` +
      `• *"enable easypaisa"* یا *"disable easypaisa"*\n` +
      `• *"enable jazzcash"* یا *"disable jazzcash"*\n` +
      `• *"enable sadapay"* یا *"disable sadapay"*\n` +
      `• *"enable meezan"* یا *"enable hbl"*`;
  } else {
    text = `💳 *Payment Channels & Bank Methods*\n\n` +
      `Current channel status:\n\n${lines.join('\n')}\n\n` +
      `💡 *Commands to toggle:*\n` +
      `• *"enable easypaisa"* or *"disable easypaisa"*\n` +
      `• *"enable jazzcash"* or *"disable jazzcash"*\n` +
      `• *"enable sadapay"* or *"disable sadapay"*\n` +
      `• *"enable meezan"* or *"enable hbl"*`;
  }

  const buttons = [
    {
      id: 'toggle_pay_easypaisa',
      title: activeSet.has('easypaisa') ? '❌ EasyPaisa' : '✅ EasyPaisa',
    },
    {
      id: 'toggle_pay_jazzcash',
      title: activeSet.has('jazzcash') ? '❌ JazzCash' : '✅ JazzCash',
    },
    {
      id: 'menu_help',
      title: language === 'ur' ? '📋 مینیو' : '📋 Menu',
    },
  ];

  const res = await sendInteractiveButtons(targetPhone, text, buttons);
  if (!res) {
    await sendTextMessage(targetPhone, text);
  }
}

/**
 * Toggles or explicitly sets payment methods (e.g. enable easypaisa, disable jazzcash).
 */
async function handleTogglePaymentMethod(merchant, rawMethod, forceState = null) {
  const targetPhone = getSenderRecipient(merchant);
  const language = merchant.language || 'ur';
  const methodId = normalizePaymentMethod(rawMethod);

  if (!methodId || !isValidPaymentMethod(methodId)) {
    const errorMsg = language === 'ur'
      ? `معذرت، ادائیگی کا طریقہ "${rawMethod}" سمجھ نہیں آیا۔ آپ cash, easypaisa, jazzcash, sadapay, nayapay, raast, meezan, hbl وغیرہ استعمال کر سکتے ہیں۔`
      : `Payment method "${rawMethod}" was not recognized. Available channels include: cash, easypaisa, jazzcash, sadapay, nayapay, raast, meezan, hbl, etc.`;
    return sendTextMessage(targetPhone, errorMsg);
  }

  let list = Array.isArray(merchant.acceptedPaymentMethods) ? [...merchant.acceptedPaymentMethods] : ['cash'];
  const existsIndex = list.indexOf(methodId);
  let nowEnabled = false;

  if (forceState === true) {
    if (existsIndex >= 0) {
      const alreadyMsg = language === 'ur'
        ? `ℹ️ *${formatPaymentMethod(methodId, language)}* پہلے سے فعال ہے۔`
        : `ℹ️ *${formatPaymentMethod(methodId, language)}* is already enabled.`;
      return sendTextMessage(targetPhone, alreadyMsg);
    }
    list.push(methodId);
    nowEnabled = true;
  } else if (forceState === false) {
    if (existsIndex < 0) {
      const alreadyMsg = language === 'ur'
        ? `ℹ️ *${formatPaymentMethod(methodId, language)}* پہلے سے غیر فعال ہے۔`
        : `ℹ️ *${formatPaymentMethod(methodId, language)}* is already disabled.`;
      return sendTextMessage(targetPhone, alreadyMsg);
    }
    if (methodId === 'cash' && list.length === 1) {
      const msg = language === 'ur'
        ? 'کیش کو بند نہیں کیا جا سکتا کیونکہ یہ واحد طریقہ ہے جو ابھی فعال ہے۔'
        : 'Cash cannot be disabled when it is your only active payment channel.';
      return sendTextMessage(targetPhone, msg);
    }
    list.splice(existsIndex, 1);
    nowEnabled = false;
  } else {
    // Toggle
    if (existsIndex >= 0) {
      if (methodId === 'cash' && list.length === 1) {
        const msg = language === 'ur'
          ? 'کیش کو بند نہیں کیا جا سکتا کیونکہ یہ واحد طریقہ ہے جو ابھی فعال ہے۔'
          : 'Cash cannot be disabled when it is your only active payment channel.';
        return sendTextMessage(targetPhone, msg);
      }
      list.splice(existsIndex, 1);
      nowEnabled = false;
    } else {
      list.push(methodId);
      nowEnabled = true;
    }
  }

  merchant.acceptedPaymentMethods = list;
  await merchant.save();
  emitDashboardUpdate(merchant._id, { type: 'profile' });

  const methodName = formatPaymentMethod(methodId, language);
  const msg = language === 'ur'
    ? (nowEnabled ? `✅ *${methodName}* کو کامیابی سے چالو کر دیا گیا ہے۔` : `❌ *${methodName}* کو غیر فعال کر دیا گیا ہے۔`)
    : (nowEnabled ? `✅ *${methodName}* has been enabled successfully.` : `❌ *${methodName}* has been disabled.`);

  return sendTextMessage(targetPhone, msg);
}

/**
 * Lists all active workflows and alerts configured for this merchant.
 */
async function sendWorkflowsList(merchant) {
  const targetPhone = getSenderRecipient(merchant);
  const language = merchant.language || 'ur';
  const workflows = await Workflow.find({ merchantId: merchant._id }).sort({ createdAt: -1 });

  if (!workflows || workflows.length === 0) {
    const text = language === 'ur'
      ? `⚡ *کوئی آٹومیشن الرٹ موجود نہیں ہے!*\n\nآپ کسی بھی وقت بول کر یا لکھ کر خودکار الرٹ بنا سکتے ہیں:\n• وائس نوٹ: "جب بھی چینی 5 کلو سے کم ہو مجھے الرٹ کرو"\n• ٹیکسٹ: "alert me when rice is below 10"`
      : `⚡ *No active automations or alerts!*\n\nYou can create alerts anytime by voice or text:\n• "alert me when sugar is below 5"\n• "notify me when milk reaches 0"`;
    return sendTextMessage(targetPhone, text);
  }

  const lines = workflows.map((w, idx) => {
    const status = w.active ? '🟢' : '⚪';
    const instr = describeWorkflow(w, language);
    return `${idx + 1}. ${status} *${instr}*`;
  });

  const text = language === 'ur'
    ? `⚡ *فعال آٹومیشن الرٹس (${workflows.length}):*\n\n${lines.join('\n')}\n\n💡 نیا الرٹ بنانے کے لیے میسج بھیجیں: "جب چینی 5 سے کم ہو الرٹ کرو"`
    : `⚡ *Your Active Automations (${workflows.length}):*\n\n${lines.join('\n')}\n\n💡 To add a new alert, say or type: "alert me when oil is below 5"`;

  return sendTextMessage(targetPhone, text);
}

/**
 * Fuzzy customer lookup with honorific and title stripping.
 * Resolves "Rashid bhai", "Ali sahab", "Haji Aslam sb", "علی بھائی" to their canonical customer document.
 * With { strict: true } only the exact name or the same name minus honorifics counts, so
 * "ali" never resolves to "salim" — used when the answer decides whether a khata already exists.
 */
export async function findCustomerByFuzzyName(merchantId, rawCustomerName, { strict = false } = {}) {
  if (!rawCustomerName || typeof rawCustomerName !== 'string') return null;
  const trimmed = rawCustomerName.trim();
  if (!trimmed) return null;

  // 1. Exact match (case-insensitive)
  try {
    const exactEscaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const customer = await Customer.findOne({
      merchantId,
      name: new RegExp(`^${exactEscaped}$`, 'i'),
    });
    if (customer) return customer;
  } catch (_) {
    // If CastError or mock without findOne, continue to list search
  }

  // 2. Strip common honorifics & titles
  const HONORIFIC_REGEX = /\b(?:bhai|bhae|bhaiya|bhaijaan|bhaijan|sahab|saheb|sahib|sb|sab|khan|jan|jaan|ji|ch|chaudhry|malik|raja|sheikh|haji|mian|ustad|babu|uncle|doctor|dr|mr)\b|(?<=^|[\s\b])(?:بھائی|بھیا|بھائی\s*جان|صاحب|سب|خان|جان|جی|چوہدری|ملک|راجہ|شیخ|حاجی|میاں|استاد|ڈاکٹر)(?=[\s\b]|$)/gi;
  const strippedName = trimmed.replace(HONORIFIC_REGEX, ' ').replace(/\s+/g, ' ').trim();

  if (strippedName && strippedName.toLowerCase() !== trimmed.toLowerCase()) {
    try {
      const strippedEscaped = strippedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const customer = await Customer.findOne({
        merchantId,
        name: new RegExp(`^${strippedEscaped}$`, 'i'),
      });
      if (customer) return customer;
    } catch (_) {}
  }

  // 3. Search merchant's customer list for word boundary or prefix match
  const searchKey = (strippedName || trimmed).toLowerCase();
  let allCustomers = [];
  try {
    allCustomers = await Customer.find({ merchantId }).limit(500);
  } catch (_) {
    return null;
  }
  if (!allCustomers || allCustomers.length === 0) return null;

  for (const c of allCustomers) {
    const cName = c.name.toLowerCase().trim();
    const cStripped = cName.replace(HONORIFIC_REGEX, ' ').replace(/\s+/g, ' ').trim();
    if (cName === searchKey || cStripped === searchKey) return c;
  }

  if (strict) return null;

  for (const c of allCustomers) {
    const cName = c.name.toLowerCase().trim();
    const cStripped = cName.replace(HONORIFIC_REGEX, ' ').replace(/\s+/g, ' ').trim();
    const cWords = cStripped.split(/\s+/).filter(Boolean);
    const searchWords = searchKey.split(/\s+/).filter(Boolean);

    if (searchWords.length > 0 && cWords.length > 0) {
      if (searchWords.every(sw => cWords.includes(sw)) || cWords.every(cw => searchWords.includes(cw))) {
        return c;
      }
    }
  }

  if (searchKey.length >= 3) {
    for (const c of allCustomers) {
      const cName = c.name.toLowerCase();
      if (cName.includes(searchKey) || searchKey.includes(cName)) {
        return c;
      }
    }
  }

  return null;
}

/**
 * Handles checking a customer's Khata (ledger) balance and generating a payment reminder.
 */
export async function handleKhataInquiry(merchant, rawCustomerName, source = 'text') {
  const isUrdu = merchant.language === 'ur';
  const customer = await findCustomerByFuzzyName(merchant._id, rawCustomerName);

  if (!customer || customer.balance <= 0) {
    const msg = isUrdu
      ? `ℹ️ *${rawCustomerName.trim()}* کا کوئی بقایا ادھار/کھاتہ نہیں ہے۔`
      : `ℹ️ *${rawCustomerName.trim()}* has no outstanding balance.`;
    const spoken = isUrdu
      ? `جی محترم، ${rawCustomerName.trim()} کا کوئی بقایا ادھار نہیں ہے۔`
      : `Certainly! ${rawCustomerName.trim()} has no outstanding balance.`;
    return replyToMerchant(merchant, { spoken, text: msg }, source);
  }

  const balanceFormatted = `Rs. ${customer.balance.toLocaleString()}`;
  const storeName = merchant.businessName || (isUrdu ? 'ہماری دکان' : 'our store');

  const text = isUrdu
    ? `📋 *کھاتہ تفصیل — ${customer.name.toUpperCase()}*\nکل واجب الادا رقم: *${balanceFormatted}*\n\n📩 *گاہک کو بھیجنے کے لیے یاد دہانی (Copy & Forward):*\n"محترم ${customer.name}، آپ کی طرف ${storeName} کا ${balanceFormatted} بقایا کھاتہ ہے۔ برائے مہربانی جلد از جلد ادائیگی فرمائیں۔ شکریہ!"`
    : `📋 *Ledger Summary — ${customer.name.toUpperCase()}*\nOutstanding Balance: *${balanceFormatted}*\n\n📩 *Customer Reminder (Copy & Forward):*\n"Dear ${customer.name}, your outstanding balance at ${storeName} is ${balanceFormatted}. Please arrange payment at your earliest convenience. Thank you!"`;

  const spoken = isUrdu
    ? `جی محترم، ${customer.name} کی طرف ${customer.balance} روپے واجب الادا ہیں۔`
    : `Certainly! ${customer.name} has an outstanding balance of Rs. ${customer.balance}.`;

  return replyToMerchant(merchant, { spoken, text }, source);
}

/**
 * Handles settling/recording a cash payment towards a customer's Khata (ledger).
 */
export async function handleKhataSettle(merchant, rawCustomerName, amount, source = 'text') {
  const isUrdu = merchant.language === 'ur';
  const amountNum = Number(amount);

  if (!amountNum || amountNum <= 0) {
    const err = isUrdu ? 'براہ کرم درست رقم درج کریں۔' : 'Please provide a valid payment amount.';
    return replyToMerchant(merchant, err, source);
  }

  let customer = await findCustomerByFuzzyName(merchant._id, rawCustomerName);

  if (!customer) {
    const notFound = isUrdu
      ? `❌ *${rawCustomerName.trim()}* نامی گاہک کھاتے میں نہیں ملا۔`
      : `❌ Customer *${rawCustomerName.trim()}* not found in ledger.`;
    const spoken = isUrdu
      ? `معذرت خواہ ہوں، ${rawCustomerName.trim()} نامی گاہک کھاتے میں نہیں ملا۔`
      : `Pardon me, customer ${rawCustomerName.trim()} was not found in the ledger.`;
    return replyToMerchant(merchant, { spoken, text: notFound }, source);
  }

  const previousBalance = Number(customer.balance) || 0;

  // Nothing owed -> nothing to settle. Say so instead of silently "recording" a payment.
  if (previousBalance <= 0) {
    return replyToMerchant(merchant, spokenPhrases.khataNothingOwed(merchant.language, { customerName: customer.name }), source);
  }

  const appliedAmount = Math.min(amountNum, previousBalance);
  customer.balance = previousBalance - appliedAmount;
  await customer.save();

  await recordKhataPayment({
    merchantId: merchant._id,
    customerId: customer._id,
    amount: appliedAmount,
    balanceAfter: customer.balance,
    source: source === 'voice' ? 'voice' : 'text',
  });

  emitDashboardUpdate(merchant._id, {
    type: 'customer',
    action: 'settle',
    customerId: customer._id,
    customerName: customer.name,
    amount: appliedAmount,
    balance: customer.balance,
  });

  const phrases = spokenPhrases.khataSettled(merchant.language, {
    customerName: customer.name,
    amount: appliedAmount,
    previousBalance,
    remainingBalance: customer.balance,
    unappliedAmount: amountNum - appliedAmount,
  });

  return replyToMerchant(merchant, phrases, source);
}

/**
 * Opens a new khata (ledger account) for a customer. This is the ONLY way a khata is created
 * from WhatsApp: udhaar sales are added to an existing khata and never open one implicitly.
 * A valid Pakistani mobile number is required.
 */
export async function handleKhataCreate(merchant, rawCustomerName, rawPhone, source = 'text') {
  const language = merchant.language || 'ur';
  const name = String(rawCustomerName || '').replace(/\s+/g, ' ').trim();

  if (!name) {
    return replyToMerchant(merchant, spokenPhrases.khataNameRequired(language), source);
  }

  if (!rawPhone) {
    return replyToMerchant(merchant, spokenPhrases.khataNeedsPhone(language, { customerName: name }), source);
  }

  const phone = normalizePkMobile(rawPhone);
  if (!phone) {
    return replyToMerchant(merchant, spokenPhrases.khataInvalidPhone(language, { customerName: name }), source);
  }

  const existing = await findCustomerByFuzzyName(merchant._id, name, { strict: true });
  if (existing) {
    return replyToMerchant(merchant, spokenPhrases.khataExists(language, { customerName: existing.name, balance: existing.balance }), source);
  }

  const samePhone = await Customer.findOne({ merchantId: merchant._id, phone });
  if (samePhone) {
    return replyToMerchant(merchant, spokenPhrases.khataPhoneInUse(language, { existingName: samePhone.name }), source);
  }

  let customer;
  try {
    customer = await Customer.create({ merchantId: merchant._id, name: name.toLowerCase(), phone, balance: 0 });
  } catch (err) {
    if (err?.code === 11000) {
      return replyToMerchant(merchant, spokenPhrases.khataExists(language, { customerName: name.toLowerCase(), balance: 0 }), source);
    }
    throw err;
  }

  emitDashboardUpdate(merchant._id, {
    type: 'customer',
    action: 'create',
    customerId: customer._id,
    customerName: customer.name,
    balance: customer.balance,
  });

  return replyToMerchant(merchant, spokenPhrases.khataCreated(language, { customerName: customer.name, phone }), source);
}

/**
 * Sends a customer's khata statement as a PDF: every purchase with its date and items,
 * the payments received, and what is still owed.
 */
export async function handleKhataReport(merchant, rawCustomerName, source = 'text') {
  const language = merchant.language || 'ur';
  const name = String(rawCustomerName || '').replace(/\s+/g, ' ').trim();

  const customer = name ? await findCustomerByFuzzyName(merchant._id, name) : null;
  if (!customer) {
    return replyToMerchant(merchant, spokenPhrases.khataNotFound(language, { customerName: name }), source);
  }

  return deliverKhataReport(merchant, customer, language);
}

/**
 * Parses spoken or written intent to switch voice gender (1 Male and 1 Female only).
 */
export function parseVoiceGenderChange(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim();

  // Female voice patterns: "female voice", "aurat ki awaz", "larki ki awaz", "khatoon ki awaz", "عورت کی آواز", "لڑکی کی آواز", "فی میل آواز"
  if (
    /(?:female|aurat|larki|khatoon|زنانی|عورت|لڑکی|خاتون|فی\s*میل)\s*(?:ki\s*)?(?:awaz|voice)/i.test(lower) ||
    /(?:voice|awaz)\s*(?:ko\s*)?(?:female|aurat|larki|khatoon|زنانی|عورت|لڑکی|خاتون|فی\s*میل)/i.test(lower) ||
    /^(?:set\s*voice|voice\s*set)\s*female$/i.test(lower) ||
    /^(?:female\s*voice|aurat\s*ki\s*awaz|larki\s*ki\s*awaz|عورت\s*کی\s*آواز|لڑکی\s*کی\s*آواز)$/i.test(lower)
  ) {
    return 'female';
  }

  // Male voice patterns: "male voice", "mard ki awaz", "larke ki awaz", "مرد کی آواز", "لڑکے کی آواز", "میل آواز"
  if (
    /(?:male|mard|larka|مرد|لڑکا|میل)\s*(?:ki\s*)?(?:awaz|voice)/i.test(lower) ||
    /(?:voice|awaz)\s*(?:ko\s*)?(?:male|mard|larka|مرد|لڑکا|میل)/i.test(lower) ||
    /^(?:set\s*voice|voice\s*set)\s*male$/i.test(lower) ||
    /^(?:male\s*voice|mard\s*ki\s*awaz|larke\s*ki\s*awaz|مرد\s*کی\s*آواز|لڑکے\s*کی\s*آواز)$/i.test(lower)
  ) {
    return 'male';
  }

  // Toggle voice patterns: "change voice", "voice change", "switch voice", "awaz badlo", "awaz change", "آواز بدلو"
  if (
    /(?:change\s*voice|voice\s*change|switch\s*voice|voice\s*switch|toggle\s*voice|awaz\s*badlo|awaz\s*change|voice\s*badlo|آواز\s*بدلو|آواز\s*تبدیل)/i.test(lower)
  ) {
    return 'toggle';
  }

  return null;
}

/**
 * Handles switching the merchant's voice gender and replying in that new voice.
 */
export async function handleVoiceGenderChange(merchant, genderChoice, source = 'text') {
  let targetGender = genderChoice;
  if (genderChoice === 'toggle') {
    targetGender = merchant.voiceGender === 'male' ? 'female' : 'male';
  }

  merchant.voiceGender = targetGender;
  await merchant.save();
  emitDashboardUpdate(merchant._id, { type: 'profile' });

  const phrases = spokenPhrases.voiceSwitched(merchant.language, targetGender);
  return replyToMerchant(merchant, phrases, source === 'voice' ? 'voice' : 'text');
}

/**
 * Handles merchant requesting a password reset directly in WhatsApp chat.
 */
async function handleForgotPassword(merchant) {
  const targetPhone = getSenderRecipient(merchant);
  const isUrdu = merchant.language === 'ur';

  if (merchant._staffMember) {
    const msg = isUrdu
      ? 'صرف دکان کا مالک ڈیش بورڈ پاسورڈ ری سیٹ کر سکتا ہے۔'
      : 'Only the store owner can reset the dashboard password.';
    return sendTextMessage(targetPhone, msg);
  }

  const now = new Date();
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  let resetRecord = await PasswordResetCode.findOne({ merchantId: merchant._id });
  if (!resetRecord) {
    resetRecord = await PasswordResetCode.create({
      merchantId: merchant._id,
      whatsappNumber: targetPhone,
      code,
      expiresAt,
      usedAt: null,
      requestHistory: [now],
    });
  } else {
    resetRecord.code = code;
    resetRecord.expiresAt = expiresAt;
    resetRecord.usedAt = null;
    resetRecord.whatsappNumber = targetPhone;
    resetRecord.requestHistory.push(now);
    await resetRecord.save();
  }

  const baseUrl = (process.env.SIGNUP_BASE_URL || 'https://verba-task.netlify.app/signup')
    .replace(/\/signup\/?$/, '')
    .trim();
  const identifier = encodeURIComponent(merchant.email || targetPhone);
  const resetLink = `${baseUrl}/forgot-password?code=${code}&identifier=${identifier}`;

  const text = isUrdu
    ? `🔐 *پاسورڈ ری سیٹ کوڈ*\n\nآپ کا تصدیقی کوڈ ہے: *${code}*\n(یہ کوڈ اگلے 10 منٹ تک کارآمد ہے)\n\nیا ڈائریکٹ نیا پاسورڈ رکھنے کے لیے اس لنک پر کلک کریں:\n${resetLink}`
    : `🔐 *Password Reset Code*\n\nYour verification code is: *${code}*\n(Expires in 10 minutes)\n\nOr click here to reset your password directly:\n${resetLink}`;

  return sendTextMessage(targetPhone, text);
}

/**
 * Handles daily sales hisab / end-of-day summary calculation.
 */
async function handleDailyHisab(merchant) {
  const isUrdu = merchant.language === 'ur';
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayOrders = await Order.find({
    merchantId: merchant._id,
    createdAt: { $gte: startOfDay },
  });

  if (!todayOrders || todayOrders.length === 0) {
    const emptyMsg = isUrdu
      ? '📊 آج کی تاریخ میں ابھی تک کوئی سیل درج نہیں ہوئی۔'
      : '📊 No sales have been recorded for today yet.';
    const emptySpoken = isUrdu
      ? 'آج کی تاریخ میں ابھی تک کوئی سیل درج نہیں ہوئی۔'
      : 'No sales have been recorded for today yet.';
    return replyToMerchant(merchant, { spoken: emptySpoken, text: emptyMsg }, 'text');
  }

  let totalRevenue = 0;
  const paymentBreakdown = {};
  const itemCounts = {};

  for (const o of todayOrders) {
    totalRevenue += o.total || 0;
    const pm = o.paymentMethod || 'cash';
    paymentBreakdown[pm] = (paymentBreakdown[pm] || 0) + (o.total || 0);

    for (const itm of o.items || []) {
      const name = itm.name || 'Item';
      itemCounts[name] = (itemCounts[name] || 0) + (itm.quantity || 1);
    }
  }

  let topItem = null;
  let topCount = 0;
  for (const [name, count] of Object.entries(itemCounts)) {
    if (count > topCount) {
      topCount = count;
      topItem = name;
    }
  }

  const storeName = merchant.businessName || (isUrdu ? 'آپ کی دکان' : 'Store');
  let summary = isUrdu
    ? `📊 *آج کا حساب کتاب — ${storeName}*\n\n💰 کل فروخت: *Rs. ${totalRevenue.toLocaleString()}*\n📦 کل آرڈرز: *${todayOrders.length}*\n`
    : `📊 *Today's Sales Summary — ${storeName}*\n\n💰 Total Sales: *Rs. ${totalRevenue.toLocaleString()}*\n📦 Total Orders: *${todayOrders.length}*\n`;

  summary += isUrdu ? '\n💳 *ادائیگی کا طریقہ:*' : '\n💳 *Payment Methods:*';
  for (const [pm, amt] of Object.entries(paymentBreakdown)) {
    const pmName = isUrdu
      ? (pm === 'udhaar' ? 'ادھار / کھاتہ' : pm)
      : pm.toUpperCase();
    summary += `\n• ${pmName}: Rs. ${amt.toLocaleString()}`;
  }

  if (topItem) {
    summary += isUrdu
      ? `\n\n🔥 سب سے زیادہ فروخت: *${topItem}* (${topCount} عدد)`
      : `\n\n🔥 Top Selling: *${topItem}* (${topCount} units)`;
  }

  const spoken = isUrdu
    ? `آج آپ کی کل فروخت ${totalRevenue} روپے ہے، اور کل ${todayOrders.length} آرڈرز درج ہوئے ہیں۔${topItem ? ` سب سے زیادہ فروخت ${topItem} کی ہوئی۔` : ''}`
    : `Today's total sales are Rs. ${totalRevenue}, across ${todayOrders.length} orders.${topItem ? ` Top selling item was ${topItem}.` : ''}`;

  return replyToMerchant(merchant, { spoken, text: summary }, 'text');
}

/**
 * Handles proactive low stock inquiries.
 */
async function handleLowStockCheck(merchant) {
  const isUrdu = merchant.language === 'ur';
  const items = await InventoryItem.find({
    merchantId: merchant._id,
    quantity: { $lte: 5 },
  }).sort({ quantity: 1 });

  if (!items || items.length === 0) {
    const okMsg = isUrdu
      ? '✅ ماشاءاللہ، تمام اشیاء کا اسٹاک مناسب ہے۔ کوئی چیز کم نہیں ہے۔'
      : '✅ All inventory items are well-stocked. No items are currently low.';
    const okSpoken = isUrdu
      ? 'تمام اشیاء کا اسٹاک مناسب ہے۔ کوئی چیز کم نہیں ہے۔'
      : 'All inventory items are well-stocked.';
    return replyToMerchant(merchant, { spoken: okSpoken, text: okMsg }, 'text');
  }

  let text = isUrdu
    ? `⚠️ *کم اسٹاک والی اشیاء کی لسٹ:*\n`
    : `⚠️ *Low Stock Warning List:*\n`;

  for (const itm of items) {
    const unitStr = itm.unit ? ` ${itm.unit}` : '';
    text += `\n• *${itm.name}*: صرف ${itm.quantity}${unitStr} باقی`;
  }

  text += isUrdu
    ? `\n\nنیا مال شامل کرنے کے لیے بولیں یا لکھیں (مثلاً: "add 20 ${items[0].name}")`
    : `\n\nTo restock, reply (e.g. "add 20 ${items[0].name}")`;

  const lowSpoken = isUrdu
    ? `کم اسٹاک میں یہ اشیاء شامل ہیں: ${items.slice(0, 3).map(i => i.name).join('، ')}۔ مزید مال شامل کرنے کے لیے بولیں یا لکھیں۔`
    : `Low stock items include: ${items.slice(0, 3).map(i => i.name).join(', ')}. Please restock.`;

  return replyToMerchant(merchant, { spoken: lowSpoken, text }, 'text');
}
