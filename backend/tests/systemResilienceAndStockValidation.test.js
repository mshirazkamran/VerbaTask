import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import InventoryItem from '../src/models/InventoryItem.js';
import Order from '../src/models/Order.js';
import { createOrder } from '../src/crm/order.service.js';
import {
  parseStockHeuristic,
  parseStandardSaleHeuristic,
  parseReturnOrExchangeHeuristic,
} from '../src/services/qwen.service.js';

describe('System Resilience & Stock Validation Tests', () => {
  let testMerchantId;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/verbatask_test';
      await mongoose.connect(uri);
    }
    testMerchantId = new mongoose.Types.ObjectId();
  });

  after(async () => {
    if (testMerchantId && mongoose.connection.readyState !== 0) {
      try {
        await InventoryItem.deleteMany({ merchantId: testMerchantId });
        await Order.deleteMany({ merchantId: testMerchantId });
      } catch (_) {}
      await mongoose.disconnect();
    }
  });

  describe('Fast-Path Kiryana Restock Variations (parseStockHeuristic)', () => {
    it('parses "maal aaya 10 chini" with double "a"', () => {
      const res = parseStockHeuristic('maal aaya 10 chini');
      assert.ok(res);
      assert.equal(res.type, 'update_stock');
      assert.equal(res.item.name, 'chini');
      assert.equal(res.item.quantity, 10);
    });

    it('parses "mal aya 10 daal" with single "a"s', () => {
      const res = parseStockHeuristic('mal aya 10 daal');
      assert.ok(res);
      assert.equal(res.type, 'update_stock');
      assert.equal(res.item.name, 'daal');
      assert.equal(res.item.quantity, 10);
    });

    it('parses "maal aa gaya 20 chini"', () => {
      const res = parseStockHeuristic('maal aa gaya 20 chini');
      assert.ok(res);
      assert.equal(res.type, 'update_stock');
      assert.equal(res.item.name, 'chini');
      assert.equal(res.item.quantity, 20);
    });
  });

  describe('Fast-Path Standard Kiryana Sales (parseStandardSaleHeuristic)', () => {
    it('parses "10 kg chawal" in 0ms without hitting LLM', () => {
      const res = parseStandardSaleHeuristic('10 kg chawal');
      assert.ok(res);
      assert.equal(res.type, 'log_sale');
      assert.equal(res.items[0].name, 'chawal');
      assert.equal(res.items[0].quantity, 10);
      assert.equal(res.items[0].unit, 'kg');
      assert.equal(res.paymentMethod, 'cash');
    });

    it('parses "2 doodh cash"', () => {
      const res = parseStandardSaleHeuristic('2 doodh cash');
      assert.ok(res);
      assert.equal(res.type, 'log_sale');
      assert.equal(res.items[0].name, 'doodh');
      assert.equal(res.items[0].quantity, 2);
      assert.equal(res.paymentMethod, 'cash');
    });

    it('parses "5 lipton cash"', () => {
      const res = parseStandardSaleHeuristic('5 lipton cash');
      assert.ok(res);
      assert.equal(res.type, 'log_sale');
      assert.equal(res.items[0].name, 'lipton');
      assert.equal(res.items[0].quantity, 5);
      assert.equal(res.paymentMethod, 'cash');
    });

    it('parses "3 panadol 150" with price', () => {
      const res = parseStandardSaleHeuristic('3 panadol 150');
      assert.ok(res);
      assert.equal(res.type, 'log_sale');
      assert.equal(res.items[0].name, 'panadol');
      assert.equal(res.items[0].quantity, 3);
      assert.equal(res.items[0].price, 150);
      assert.equal(res.amount, 150);
    });

    it('parses "2 chawal udhaar ali" extracting customerName', () => {
      const res = parseStandardSaleHeuristic('2 chawal udhaar ali');
      assert.ok(res);
      assert.equal(res.type, 'log_sale');
      assert.equal(res.items[0].name, 'chawal');
      assert.equal(res.items[0].quantity, 2);
      assert.equal(res.paymentMethod, 'udhaar');
      assert.equal(res.customerName, 'ali');
    });

    it('parses multi-item sale "2 doodh aur 1 bread"', () => {
      const res = parseStandardSaleHeuristic('2 doodh aur 1 bread');
      assert.ok(res);
      assert.equal(res.type, 'log_sale');
      assert.equal(res.items.length, 2);
      assert.equal(res.items[0].name, 'doodh');
      assert.equal(res.items[0].quantity, 2);
      assert.equal(res.items[1].name, 'bread');
      assert.equal(res.items[1].quantity, 1);
    });

    it('does not falsely trigger on greetings or stock queries', () => {
      assert.equal(parseStandardSaleHeuristic('salam'), null);
      assert.equal(parseStandardSaleHeuristic('rice kitna hai'), null);
      assert.equal(parseStandardSaleHeuristic('send sales report'), null);
    });
  });

  describe('Return Phrasing Cleanup (parseReturnOrExchangeHeuristic)', () => {
    it('"ye wapis aa gaya" yields itemName null (not "aa gaya")', () => {
      const res = parseReturnOrExchangeHeuristic('ye wapis aa gaya');
      assert.ok(res);
      assert.equal(res.type, 'return_order');
      assert.equal(res.itemName, null);
    });

    it('"order 123456 wapis" yields orderNumber 123456', () => {
      const res = parseReturnOrExchangeHeuristic('order 123456 wapis');
      assert.ok(res);
      assert.equal(res.type, 'return_order');
      assert.equal(res.orderNumber, '123456');
      assert.equal(res.itemName, null);
    });

    it('"chawal wapis kar lo" preserves the actual returned item', () => {
      const res = parseReturnOrExchangeHeuristic('chawal wapis kar lo');
      assert.ok(res);
      assert.equal(res.type, 'return_order');
      assert.equal(res.itemName, 'chawal');
    });
  });

  describe('Stock Pre-Validation & Atomic Rollback in createOrder', () => {
    it('aborts without partial deduction if second item has insufficient stock', async () => {
      const itemA = await InventoryItem.create({
        merchantId: testMerchantId,
        name: 'Safe Sugar',
        quantity: 10,
        price: 150,
      });

      const itemB = await InventoryItem.create({
        merchantId: testMerchantId,
        name: 'Safe Rice',
        quantity: 2,
        price: 250,
      });

      // Order requests 5 of itemA (available 10) and 5 of itemB (available only 2)
      await assert.rejects(
        async () => {
          await createOrder({
            merchantId: testMerchantId,
            items: [
              { inventoryItemId: itemA._id, quantity: 5 },
              { inventoryItemId: itemB._id, quantity: 5 },
            ],
            paymentMethod: 'cash',
            source: 'dashboard',
          });
        },
        /INSUFFICIENT_STOCK/
      );

      // Verify itemA was NOT deducted because transaction aborted in Phase 1
      const refetchedA = await InventoryItem.findById(itemA._id);
      const refetchedB = await InventoryItem.findById(itemB._id);
      assert.equal(refetchedA.quantity, 10, 'Item A must retain its original quantity');
      assert.equal(refetchedB.quantity, 2, 'Item B must retain its original quantity');
    });

    it('aggregates same item across multiple rows and rejects before deducting', async () => {
      const item = await InventoryItem.create({
        merchantId: testMerchantId,
        name: 'Cumulative Cooking Oil',
        quantity: 5,
        price: 500,
      });

      // 3 in row 1, 3 in row 2 = 6 requested, but only 5 in stock
      await assert.rejects(
        async () => {
          await createOrder({
            merchantId: testMerchantId,
            items: [
              { inventoryItemId: item._id, quantity: 3 },
              { inventoryItemId: item._id, quantity: 3 },
            ],
            paymentMethod: 'cash',
            source: 'dashboard',
          });
        },
        /INSUFFICIENT_STOCK/
      );

      const refetched = await InventoryItem.findById(item._id);
      assert.equal(refetched.quantity, 5);
    });

    it('successfully deducts and clamps at 0 for valid orders', async () => {
      const item = await InventoryItem.create({
        merchantId: testMerchantId,
        name: 'Flour Atta',
        quantity: 4,
        price: 120,
      });

      const order = await createOrder({
        merchantId: testMerchantId,
        items: [{ inventoryItemId: item._id, quantity: 4 }],
        paymentMethod: 'cash',
        source: 'dashboard',
      });

      assert.ok(order);
      const refetched = await InventoryItem.findById(item._id);
      assert.equal(refetched.quantity, 0);
    });
  });

  describe('Inventory Schema min: 0 Enforcement', () => {
    it('rejects saving negative quantity via Mongoose validation', async () => {
      const negativeItem = new InventoryItem({
        merchantId: testMerchantId,
        name: 'Negative Test Item',
        quantity: -5,
      });

      await assert.rejects(async () => {
        await negativeItem.save();
      }, /Quantity cannot be negative/);
    });
  });
});
