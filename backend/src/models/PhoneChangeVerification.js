import mongoose from 'mongoose';

const phoneChangeVerificationSchema = new mongoose.Schema(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
    newWhatsappNumber: { type: String, required: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    requestHistory: [{ type: Date, default: Date.now }],
  },
  {
    timestamps: true,
  }
);

phoneChangeVerificationSchema.index({ merchantId: 1 });
phoneChangeVerificationSchema.index({ newWhatsappNumber: 1 });

export default mongoose.model('PhoneChangeVerification', phoneChangeVerificationSchema);
