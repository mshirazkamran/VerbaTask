import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  name:       { type: String, required: true },
  quantity:   { type: Number, default: 0 },
  price:      { type: Number },
  unit:       { type: String } // e.g., "bag", "kg", "piece"
}, { 
  timestamps: true 
});

export default mongoose.model('InventoryItem', inventoryItemSchema);