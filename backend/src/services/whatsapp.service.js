/**
 * WhatsApp Cloud API sender — the only module that talks to Meta's Graph
 * API for outbound messages. Pure service layer: no Express, no DB.
 */
import axios from 'axios';

const GRAPH_VERSION = 'v20.0';

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

/**
 * Reply buttons — max 3, each title max 20 chars (WhatsApp's hard limit).
 * buttons: [{ id: 'confirm_order', title: 'Confirm' }, ...]
 */
export async function sendInteractiveButtons(to, bodyText, buttons) {
  if (buttons.length > 3) throw new Error('WhatsApp reply buttons: max 3 allowed');
  return send({
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

/**
 * List message — use this for the item picker (stock lists routinely exceed
 * the 3-button cap). WhatsApp caps list messages at 10 rows total across all
 * sections — if a merchant's stock list is bigger than that, page it
 * (see paginateRows below) rather than silently truncating.
 * sections: [{ title: 'Rice', rows: [{ id, title, description }] }]
 */
export async function sendInteractiveList(to, bodyText, buttonText, sections) {
  const totalRows = sections.reduce((sum, s) => sum + s.rows.length, 0);
  if (totalRows > 10) throw new Error('WhatsApp list message: max 10 rows total');
  return send({
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: { button: buttonText.slice(0, 20), sections },
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
