/**
 * WhatsApp Cloud API sender — the only module that talks to Meta's Graph
 * API for outbound messages. Pure service layer: no Express, no DB.
 */
import axios from 'axios';
import { synthesizeSpeech } from './tts.service.js';
import { uploadMedia } from './media.service.js';

const GRAPH_VERSION = 'v20.0';
const DEFAULT_COMPANION_TEXT = process.env.VOICE_REPLY_SEND_COMPANION_TEXT === 'true';

/** Pre-configured axios instance for the /{phone-number-id}/messages endpoint. */
function graph() {
  return axios.create({
    baseURL: `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}`,
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
    timeout: 10_000,
  });
}

/** Every send goes through here so retry/logging behaviour is in one place. */
async function send(payload) {
  try {
    const { data } = await graph().post('/messages', {
      messaging_product: 'whatsapp',
      ...payload,
    });
    return data;
  } catch (err) {
    const details = err.response?.data ?? err.message;
    console.error('WhatsApp send failed:', JSON.stringify(details));
    throw err;
  }
}

/** Plain text message. */
export async function sendTextMessage(to, body) {
  return send({ to, type: 'text', text: { body, preview_url: false } });
}

/** Audio / voice note message using an uploaded Meta media ID. */
export async function sendAudioMessage(to, mediaId) {
  return send({
    to,
    type: 'audio',
    audio: { id: mediaId },
  });
}

/** Document message using an uploaded Meta media ID (e.g. PDF report). */
export async function sendDocumentMessage(to, mediaId, filename, caption = '') {
  return send({
    to,
    type: 'document',
    document: { id: mediaId, filename, caption },
  });
}

/**
 * Sends a spoken voice reply to the merchant using TTS, with an optional
 * companion text message. Gracefully falls back to plain text if TTS synthesis
 * or media upload encounters any issue.
 *
 * @param {string} to - Recipient WhatsApp number
 * @param {Object} options
 * @param {string} options.spokenText - Natural text to synthesize and speak
 * @param {string} [options.textReceipt] - Optional companion text receipt for the chat history
 * @param {string} [options.language='ur'] - 'ur' or 'en'
 * @param {boolean} [options.alsoSendText] - Whether to send companion text alongside voice
 */
export async function sendVoiceReply(to, { spokenText, textReceipt = null, language = 'ur', alsoSendText = DEFAULT_COMPANION_TEXT, voice = null, voiceGender = null }) {
  try {
    const { buffer, mimeType, provider, voice: usedVoice } = await synthesizeSpeech(spokenText, {
      language,
      voice,
      voiceGender,
      strictNeuralOnly: true,
    });
    console.log(`[voice-out] Generated audio for ${to} using provider="${provider}" voice="${usedVoice}" gender="${voiceGender || 'default'}"`);

    const { id: mediaId } = await uploadMedia(buffer, mimeType, 'voice_reply.mp3');
    const audioRes = await sendAudioMessage(to, mediaId);
    console.log(`[voice-out] Voice reply successfully delivered to ${to} (mediaId: ${mediaId})`);

    if (alsoSendText && textReceipt) {
      await sendTextMessage(to, textReceipt).catch((err) => {
        console.warn('Companion text send failed (audio already delivered):', err.message);
      });
    }

    return audioRes;
  } catch (err) {
    console.warn(`[voice-out] Voice reply failed for ${to} (${err.message}), falling back to text`);
    const fallbackText = textReceipt || spokenText;
    return sendTextMessage(to, fallbackText);
  }
}

/**
 * Reply buttons — max 3, each title max 20 chars (WhatsApp's hard limit).
 * buttons: [{ id: 'confirm_order', title: 'Confirm' }, ...]
 */
export async function sendInteractiveButtons(to, bodyText, buttons = []) {
  const safeButtons = (buttons || []).slice(0, 3);
  const truncatedBody = String(bodyText || '').slice(0, 1024);
  return send({
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: truncatedBody },
      action: {
        buttons: safeButtons.map((b) => ({
          type: 'reply',
          reply: { id: String(b.id), title: String(b.title || '').slice(0, 20) },
        })),
      },
    },
  });
}

/**
 * List message — use this for the item picker (stock lists routinely exceed
 * the 3-button cap). WhatsApp caps list messages at 10 rows total across all
 * sections. We safely clamp rows to 10 and titles/descriptions to Meta's hard limits.
 * sections: [{ title: 'Rice', rows: [{ id, title, description }] }]
 */
export async function sendInteractiveList(to, bodyText, buttonText, sections = []) {
  let rowCount = 0;
  const safeSections = [];
  for (const s of (sections || [])) {
    if (rowCount >= 10) break;
    const remainingSlots = 10 - rowCount;
    const safeRows = (s.rows || []).slice(0, remainingSlots).map((r) => ({
      id: String(r.id),
      title: String(r.title || '').slice(0, 24),
      ...(r.description ? { description: String(r.description).slice(0, 72) } : {}),
    }));
    rowCount += safeRows.length;
    safeSections.push({
      title: String(s.title || 'Options').slice(0, 24),
      rows: safeRows,
    });
  }

  return send({
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: String(bodyText || '').slice(0, 1024) },
      action: { button: String(buttonText || 'Select').slice(0, 20), sections: safeSections },
    },
  });
}

// Splits a flat list of {id, title} into WhatsApp-list-safe pages of <=10.
export function paginateRows(items, pageSize = 9) {
  // 9, not 10 — leaves room for a "Show more" row on every page but the last.
  const pages = [];
  for (let i = 0; i < items.length; i += pageSize) pages.push(items.slice(i, i + pageSize));
  return pages;
}

/**
 * Template message — required for anything VerbaTask sends *first*, outside
 * a 24h reply window (e.g. a scheduled workflow alert). Must match an
 * approved template name/language exactly.
 * bodyParams: ['Ahmed\'s Store', 'Rice stock is running low (3 bags left)']
 */
export async function sendTemplateMessage(to, templateName, languageCode, bodyParams = []) {
  return send({
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: bodyParams.length
        ? [{ type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text })) }]
        : [],
    },
  });
}

/** Marks an inbound message as read (blue ticks). Non-critical — failures are logged, never thrown. */
export async function markAsRead(messageId) {
  try {
    await graph().post('/messages', {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
  } catch (err) {
    // Non-critical — never let a failed read-receipt break the actual flow.
    console.warn('markAsRead failed:', err.response?.data ?? err.message);
  }
}
