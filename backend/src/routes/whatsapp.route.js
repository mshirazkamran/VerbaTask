import { Router } from 'express';
import { verifyWebhook, handleIncomingMessage } from '../controllers/whatsapp.controller.js';
import { verifyWhatsappSignature } from '../middleware/verifyWhatsappSignature.js';

const router = Router();

// Meta's one-time webhook verification handshake (GET)
router.get('/', verifyWebhook);

// Every real inbound event (POST)
router.post('/', verifyWhatsappSignature, handleIncomingMessage);

// THIS IS THE MISSING LINE:
export default router;