import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  merchantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  orderId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // null until matched
  transactionId: { type: String },
  amount:        { type: Number },
  provider:      { type: String, enum: ['easypaisa', 'jazzcash', 'bank'] },
  screenshotUrl: { type: String },
  matchStatus:   { type: String, enum: ['matched', 'unmatched'], default: 'unmatched' }
}, { 
  timestamps: true 
});

export default mongoose.model('Payment', paymentSchema);