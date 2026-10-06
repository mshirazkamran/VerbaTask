import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  name:       { type: String, required: true },
  quantity:   { type: Number, default: 0 },
  price:      { type: Number },
  unit:        { type: String }, // e.g., "bag", "kg", "piece"
  expiryDates: { type: [String], default: [] }, // format 'YYYY-MM'
  aliases:     { type: [String], default: [] }, // learned aliases & transliterations
}, { 
  timestamps: true 
});

inventoryItemSchema.index({ merchantId: 1, name: 1 });
inventoryItemSchema.index({ merchantId: 1, aliases: 1 });

export default mongoose.model('InventoryItem', inventoryItemSchema);