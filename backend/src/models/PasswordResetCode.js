import mongoose from 'mongoose';

const passwordResetCodeSchema = new mongoose.Schema(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
    whatsappNumber: { type: String, required: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    requestHistory: [{ type: Date, default: Date.now }],
  },
  {
    timestamps: true,
  }
);

passwordResetCodeSchema.index({ merchantId: 1 });
passwordResetCodeSchema.index({ whatsappNumber: 1 });

export default mongoose.model('PasswordResetCode', passwordResetCodeSchema);
