import mongoose from 'mongoose';

const workflowSchema = new mongoose.Schema({
  merchantId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  rawInstruction: { type: String },
  trigger:        { type: String, enum: ['message', 'schedule', 'threshold'], required: true },
  // Shapes are enforced by workflows/workflow.rules.js before anything is saved.
  condition:      { type: mongoose.Schema.Types.Mixed },
  action:         { type: mongoose.Schema.Types.Mixed },
  active:         { type: Boolean, default: true },
  nextRunAt:      { type: Date },
  // Threshold workflows: items currently below the limit that were already
  // alerted. Cleared per item on restock so each drop alerts exactly once.
  firedItems:     { type: [mongoose.Schema.Types.ObjectId], default: [] }
}, { 
  timestamps: true 
});

export default mongoose.model('Workflow', workflowSchema);