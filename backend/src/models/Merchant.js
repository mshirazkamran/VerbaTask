import mongoose from 'mongoose';

const merchantSchema = new mongoose.Schema({
  whatsappNumber: { type: String, required: true, unique: true },
  email:          { type: String, required: true, unique: true },
  passwordHash:   { type: String, required: true },
  businessName:   { type: String },
  location:       { type: String },
  sells:          { type: String },
  language:       { type: String, enum: ['ur', 'en'], default: 'ur' },
  onboardingComplete: { type: Boolean, default: false }
}, { 
  timestamps: true 
});

export default mongoose.model('Merchant', merchantSchema);