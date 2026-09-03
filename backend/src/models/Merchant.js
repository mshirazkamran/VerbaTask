import mongoose from 'mongoose';
import { DEFAULT_ACCEPTED_PAYMENT_METHODS } from '../constants/paymentMethods.js';

const merchantSchema = new mongoose.Schema({
  whatsappNumber: { type: String, required: true, unique: true },
  email:          { type: String, required: true, unique: true },
  passwordHash:   { type: String, required: true },
  businessName:   { type: String },
  businessType:   { type: String, enum: ['general', 'kiryana', 'medical', 'clothing', 'restaurant', 'electronics', 'services', 'auto', 'salon'], default: 'general' },
  location:       { type: String },
  sells:          { type: String },
  language:       { type: String, enum: ['ur', 'en'], default: 'ur' },
  onboardingComplete: { type: Boolean, default: false },
  voiceReplies:   { type: Boolean, default: true },
  replyPreference: { type: String, enum: ['voice_on_voice', 'always_voice', 'text_only'], default: 'voice_on_voice' },
  acceptedPaymentMethods: {
    type: [String],
    default: DEFAULT_ACCEPTED_PAYMENT_METHODS,
  },
  paymentDetails: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { 
  timestamps: true 
});

export default mongoose.model('Merchant', merchantSchema);