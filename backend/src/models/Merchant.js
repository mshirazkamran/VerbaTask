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
  // Off: automations requested on WhatsApp are saved immediately. On: the bot
  // reads each one back with Save / Cancel buttons first.
  confirmAutomations: { type: Boolean, default: false },
  defaultPaymentMethod: { type: String, default: 'cash', trim: true, lowercase: true },
  acceptedPaymentMethods: {
    type: [String],
    default: DEFAULT_ACCEPTED_PAYMENT_METHODS,
  },
  paymentDetails: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  shopCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true,
  },
  subscriptionTier: {
    type: String,
    enum: ['free', 'starter', 'pro', 'enterprise'],
    default: 'pro',
  },
  staffMembers: [{
    name: { type: String, required: true, trim: true },
    whatsappNumber: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
    addedAt: { type: Date, default: Date.now },
    addedBy: { type: String, enum: ['owner', 'whatsapp_code'], default: 'owner' },
  }],
}, { 
  timestamps: true 
});

merchantSchema.pre('save', function (next) {
  if (!this.shopCode) {
    this.shopCode = `VT-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  next();
});

export default mongoose.model('Merchant', merchantSchema);