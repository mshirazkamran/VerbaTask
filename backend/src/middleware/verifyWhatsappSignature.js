import crypto from 'crypto';

/**
 * Meta signs every webhook POST body with your App Secret (HMAC-SHA256) and
 * sends it in the X-Hub-Signature-256 header. Verifying it stops anyone else
 * on the internet from POSTing fake "incoming messages" to your endpoint —
 * without this, /webhook/whatsapp is a completely open door.
 *
 * Requires the RAW request body (not the parsed JSON) — see index.js, which
 * captures it via express.json()'s `verify` option before this middleware runs.
 */
export function verifyWhatsappSignature(req, res, next) {
  const signature = req.get('x-hub-signature-256');

  if (!signature || !req.rawBody) {
    console.warn('WhatsApp webhook: missing signature or raw body — rejecting');
    return res.sendStatus(401);
  }

  const expected =
    'sha256=' +
    crypto.createHmac('sha256', process.env.WHATSAPP_APP_SECRET).update(req.rawBody).digest('hex');

  const provided = Buffer.from(signature);
  const computed = Buffer.from(expected);

  const valid =
    provided.length === computed.length && crypto.timingSafeEqual(provided, computed);

  if (!valid) {
    console.warn('WhatsApp webhook: signature mismatch — rejecting');
    return res.sendStatus(401);
  }

  next();
}