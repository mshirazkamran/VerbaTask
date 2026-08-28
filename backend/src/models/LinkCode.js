import mongoose from 'mongoose';

const linkCodeSchema = new mongoose.Schema({
  whatsappNumber: { type: String, required: true },
  code:           { type: String, required: true },
  expiresAt:      { type: Date, required: true },
  usedAt:         { type: Date }
}, { 
  timestamps: true 
});

export default mongoose.model('LinkCode', linkCodeSchema);