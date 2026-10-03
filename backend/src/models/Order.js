import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  items: [{
    inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    name: { type: String },
    quantity: { type: Number },
    price: { type: Number }
  }],
  orderNumber: { type: String, required: true, index: true },
  total: { type: Number },
  paymentMethod: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true,
  },
  source: { 
    type: String, 
    enum: ['guided', 'voice', 'dashboard', 'text'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending_approval', 'approved', 'completed', 'rejected'], 
    default: 'completed' 
  }
}, { 
  timestamps: true 
});

orderSchema.index({ merchantId: 1, orderNumber: 1 }, { unique: true });

export default mongoose.model('Order', orderSchema);