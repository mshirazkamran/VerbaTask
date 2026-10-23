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
  // false while a high-value order waits for approval: its stock and khata charge are applied
  // only on approval. Older orders (no field) were always applied at creation.
  stockApplied: { type: Boolean, default: true },
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

/** Order statuses that count as a sale (not waiting for approval, not rejected, not fully returned). */
export const SALE_STATUSES = ['completed', 'approved', 'partially_returned', 'exchanged'];

export default mongoose.model('Order', orderSchema);