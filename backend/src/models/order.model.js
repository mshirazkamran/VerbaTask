import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  items: [{
    inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    name: { type: String },
    quantity: { type: Number },
    price: { type: Number }
  }],
  total: { type: Number },
  paymentMethod: { 
    type: String, 
    enum: ['easypaisa', 'jazzcash', 'bank', 'cash'], 
    required: true 
  },
  source: { 
    type: String, 
    enum: ['guided', 'voice', 'dashboard'], 
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

export default mongoose.model('Order', orderSchema);