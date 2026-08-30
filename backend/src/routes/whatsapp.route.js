import { Router } from 'express';
import { verifyWebhook, handleIncomingMessage } from '../controllers/whatsapp.controller.js';
import { verifyWhatsappSignature } from '../middleware/verifyWhatsappSignature.js';

const router = Router();

// Meta's one-time webhook verification handshake (GET)
router.get('/', verifyWebhook);

// Every real inbound event (POST)
router.post('/', verifyWhatsappSignature, handleIncomingMessage);

// DEBUG: raw webhook catcher — bypasses signature verification so we can see
// exactly what Meta is sending. Temporarily point the Meta callback URL here.
router.get('/debug', verifyWebhook);
router.post('/debug', (req, res) => {
  console.log('DEBUG WEBHOOK RECEIVED');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// THIS IS THE MISSING LINE:
export default router;