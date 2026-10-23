import mongoose from 'mongoose';

/**
 * One payment a customer made toward their khata (udhaar). Customer.balance only
 * holds the running total, so this is what lets a khata report show *when* each
 * payment came in.
 */
const khataPaymentSchema = new mongoose.Schema({
  merchantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  customerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  amount:       { type: Number, required: true },
  balanceAfter: { type: Number },
  source:       { type: String, enum: ['text', 'voice', 'dashboard'], default: 'text' },
}, {
  timestamps: true
});

khataPaymentSchema.index({ merchantId: 1, customerId: 1, createdAt: 1 });

export default mongoose.model('KhataPayment', khataPaymentSchema);
