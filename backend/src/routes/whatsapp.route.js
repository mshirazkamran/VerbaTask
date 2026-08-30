import { Router } from 'express';
import { verifyWebhook, handleIncomingMessage } from '../controllers/whatsapp.controller.js';
import { verifyWhatsappSignature } from '../middleware/verifyWhatsappSignature.js';

const router = Router();

// Meta's one-time webhook verification handshake (GET)
router.get('/', verifyWebhook);

// Every real inbound event (POST)
router.post('/', verifyWhatsappSignature, handleIncomingMessage);

// DEBUG: mirrors the main webhook but bypasses signature verification.
// Useful while toggling Meta callback URLs during development. Keep pointed to
// /webhook/whatsapp in production.
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_DEBUG_WEBHOOK === 'true') {
  router.get('/debug', verifyWebhook);
  router.post('/debug', handleIncomingMessage);
}

// THIS IS THE MISSING LINE:
export default router;