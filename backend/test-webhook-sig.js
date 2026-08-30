import 'dotenv/config';
import crypto from 'crypto';
import axios from 'axios';

const payload = JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '0',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '15552046026',
              phone_number_id: '1221335201072408',
            },
            contacts: [{ profile: { name: 'Test' }, wa_id: '923053331098' }],
            messages: [
              {
                id: 'testmsg1',
                from: '923053331098',
                type: 'text',
                text: { body: 'hi' },
              },
            ],
          },
          field: 'messages',
        },
      ],
    },
  ],
});

const body = Buffer.from(payload);
const signature =
  'sha256=' +
  crypto.createHmac('sha256', process.env.WHATSAPP_APP_SECRET).update(body).digest('hex');

axios
  .post('http://localhost:8080/webhook/whatsapp', payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': signature,
    },
  })
  .then((r) => console.log('SUCCESS — status:', r.status, 'body:', r.data))
  .catch((e) =>
    console.log('FAILED — status:', e.response?.status, 'body:', e.response?.data)
  );
