import mongoose from 'mongoose';

/**
 * WhatsApp gives you no built-in concept of "what step is this merchant on."
 * Every multi-message flow (onboarding, the guided item->payment->confirm
 * order flow) needs its progress stored somewhere between messages — this is
 * that somewhere. One document per WhatsApp number, overwritten as the
 * merchant moves through a flow, cleared when the flow completes.
 */
const conversationStateSchema = new mongoose.Schema(
  {
    whatsappNumber: { type: String, required: true, unique: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant' },
    flow: { type: String, enum: ['onboarding', 'guided_order', 'item_disambiguation', null], default: null },
    step: String, // e.g. 'awaiting_language' | 'awaiting_item' | 'awaiting_payment_method'
    data: { type: mongoose.Schema.Types.Mixed, default: {} }, // whatever's been collected so far in this flow
  },
  { timestamps: true }
);

export default mongoose.model('ConversationState', conversationStateSchema);
