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
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, trim: true },
  source: { 
    type: String, 
    enum: ['guided', 'voice', 'dashboard', 'text'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending_approval', 'approved', 'completed', 'rejected', 'returned', 'partially_returned', 'exchanged'], 
    default: 'completed' 
  },
  returnHistory: [{
    returnedAt: { type: Date, default: Date.now },
    items: [{
      inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
      name: String,
      quantity: Number,
      price: Number,
    }],
    refundAmount: Number,
    reason: String,
  }],
  exchangeHistory: [{
    exchangedAt: { type: Date, default: Date.now },
    returnItem: {
      inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
      name: String,
      quantity: Number,
      price: Number,
    },
    newItem: {
      inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
      name: String,
      quantity: Number,
      price: Number,
    },
    priceDifference: Number,
    reason: String,
  }],
  incomingMessageId: { type: String, index: true, sparse: true },
  confirmationMessageId: { type: String, index: true, sparse: true },
  staffName: { type: String, trim: true },
  staffPhone: { type: String, trim: true },
}, { 
  timestamps: true 
});

orderSchema.index({ merchantId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ merchantId: 1, incomingMessageId: 1 }, { sparse: true });
orderSchema.index({ merchantId: 1, confirmationMessageId: 1 }, { sparse: true });

export default mongoose.model('Order', orderSchema);