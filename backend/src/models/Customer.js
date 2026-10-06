import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  name: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  balance: { type: Number, default: 0 }, // Positive means they owe the merchant (Udhaar/Khata)
}, {
  timestamps: true
});

// A merchant can't have two customers with the exact same name (in lowercase) to avoid confusion in voice notes.
customerSchema.index({ merchantId: 1, name: 1 }, { unique: true });

export default mongoose.model('Customer', customerSchema);
