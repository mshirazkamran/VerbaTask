/**
 * WhatsApp media service — resolves a webhook media ID into a downloaded
 * buffer (voice notes, images). Pure service layer: no Express, no DB.
 */
import axios from 'axios';

import FormData from 'form-data';

const GRAPH_VERSION = 'v20.0';
const authHeaders = { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` };

/**
 * Step 1: WhatsApp gives you a media ID in the webhook payload, not a URL.
 * You have to look up the actual (short-lived) download URL first.
 */
async function getMediaUrl(mediaId) {
  const { data } = await axios.get(`https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`, {
    headers: authHeaders,
    timeout: 10_000,
  });
  return data; // { url, mime_type, sha256, file_size, id }
}

/**
 * Step 2: the download URL itself also requires your access token — a bare
 * fetch/curl without the Authorization header will 401.
 */
export async function downloadMedia(mediaId) {
  const meta = await getMediaUrl(mediaId);
  const { data, headers } = await axios.get(meta.url, {
    headers: authHeaders,
    responseType: 'arraybuffer',
    timeout: 20_000,
  });
  return {
    buffer: Buffer.from(data),
    mimeType: meta.mime_type || headers['content-type'],
    sizeBytes: meta.file_size,
  };
}

/**
 * Uploads an audio buffer (or other media) to Meta's WhatsApp media endpoint.
 * Returns the media ID required by the /messages endpoint to send audio.
 *
 * @param {Buffer} buffer - Audio binary content
 * @param {string} [mimeType='audio/mpeg'] - MIME type
 * @param {string} [filename='voice_reply.mp3'] - filename
 * @returns {Promise<{ id: string }>}
 */
export async function uploadMedia(buffer, mimeType = 'audio/mpeg', filename = 'voice_reply.mp3') {
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
    throw new Error('WhatsApp credentials (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN) not configured');
  }

  const form = new FormData();
  form.append('file', buffer, { filename, contentType: mimeType });
  form.append('type', mimeType);
  form.append('messaging_product', 'whatsapp');

  const { data } = await axios.post(
    `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      },
      timeout: 25_000,
    }
  );

  return { id: data.id };
}
