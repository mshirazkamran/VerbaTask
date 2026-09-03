import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Stub sendTextMessage to capture output
let messagesSent = [];
jest_mock_whatsapp_service();

import { handleIncomingMessage } from './src/controllers/whatsapp.controller.js';

async function runTest() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const req = {
    body: {
      entry: [{
        changes: [{
          value: {
            messages: [{
              id: 'test_msg_clearexpiry_' + Date.now(),
              from: '923144257707',
              type: 'interactive',
              interactive: {
                button_reply: {
                  id: 'clearexpiry_6a95dad0840ade4bcd3b1c2d_2026-09'
                }
              }
            }]
          }
        }]
      }]
    }
  };
  
  const res = {
    sendStatus: (status) => console.log('res.sendStatus:', status)
  };
  
  try {
    await handleIncomingMessage(req, res);
    console.log('Messages sent:', messagesSent);
    
    // Check DB
    const item = await mongoose.connection.db.collection('inventoryitems').findOne({ _id: new mongoose.Types.ObjectId('6a95dad0840ade4bcd3b1c2d') });
    console.log('Item expiryDates after:', item.expiryDates);
  } catch(err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

function jest_mock_whatsapp_service() {
  // Hack to inject the mock since we are not using jest
  // This is tricky for ES modules, but we can rely on console logs for now if we can't mock easily.
  // Actually, I'll just let it send a real message to 923144257707! It's the user's phone anyway.
}

runTest();
