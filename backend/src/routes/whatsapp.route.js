/**
 * WhatsApp webhook routes — thin mapping of HTTP verbs to controller
 * functions (per routes/ convention: no logic lives here).
 * Mounted at /webhook/whatsapp in index.js.
 */
import { Router } from 'express';
import { verifyWebhook, handleIncomingMessage } from '../controllers/whatsapp.controller.js';
import { verifyWhatsappSignature } from '../middlewares/verifyWhatsappSignature.js';

const router = Router();

// Meta's one-time webhook verification handshake (GET) — no body, no signature to check.
router.get('/', verifyWebhook);

// Every real inbound event (POST). Signature-verified so only Meta can hit this.
router.post('/', verifyWhatsappSignature, handleIncomingMessage);

export default router;
