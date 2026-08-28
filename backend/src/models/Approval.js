import mongoose from 'mongoose';

const approvalSchema = new mongoose.Schema({
  merchantId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  type:        { type: String, enum: ['order', 'workflow_action'], required: true },
  refId:       { type: mongoose.Schema.Types.ObjectId, required: true },
  summary:     { type: String },
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  respondedAt: { type: Date }
}, { 
  timestamps: true 
});

export default mongoose.model('Approval', approvalSchema);