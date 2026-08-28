/**
 * WhatsApp media service — resolves a webhook media ID into a downloaded
 * buffer (voice notes, images). Pure service layer: no Express, no DB.
 */
import axios from 'axios';

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
