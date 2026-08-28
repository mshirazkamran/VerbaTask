import mongoose from 'mongoose';

const workflowSchema = new mongoose.Schema({
  merchantId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  rawInstruction: { type: String },
  trigger:        { type: String, enum: ['message', 'schedule', 'threshold'], required: true },
  condition:      { type: mongoose.Schema.Types.Mixed }, 
  action:         { type: mongoose.Schema.Types.Mixed }, 
  active:         { type: Boolean, default: true },
  nextRunAt:      { type: Date }
}, { 
  timestamps: true 
});

export default mongoose.model('Workflow', workflowSchema);