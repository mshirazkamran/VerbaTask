import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseReturnOrExchangeHeuristic,
  parseMoneyFirstSaleHeuristic,
  NUMBER_WORDS_MAP,
} from '../src/services/qwen.service.js';
import { processOrderReturn, processOrderExchange } from '../src/crm/return.service.js';
import { createOrder } from '../src/crm/order.service.js';
import Order from '../src/models/Order.js';
import InventoryItem from '../src/models/InventoryItem.js';
import Customer from '../src/models/Customer.js';
import Merchant from '../src/models/Merchant.js';

describe('Return, Exchange & Fractional Units System Tests', () => {
  describe('Heuristic Parsing Tests', () => {
    test('parses return intent with order number', () => {
      const res1 = parseReturnOrExchangeHeuristic('order 1042 wapis kar do');
      assert.ok(res1);
      assert.equal(res1.intent, 'return_order');
      assert.equal(res1.orderNumber, '1042');

      const res2 = parseReturnOrExchangeHeuristic('VT-9988 wapas aa gaya');
      assert.ok(res2);
      assert.equal(res2.intent, 'return_order');
      assert.equal(res2.orderNumber, 'VT-9988');
    });

    test('parses contextual return message without order number', () => {
      const res = parseReturnOrExchangeHeuristic('ye wapis aa gaya');
      assert.ok(res);
      assert.equal(res.intent, 'return_order');
      assert.equal(res.orderNumber, null);
    });

    test('parses exchange intent with replacement item', () => {
      const res = parseReturnOrExchangeHeuristic('is ki jagah cheeni de do');
      assert.ok(res);
      assert.equal(res.intent, 'exchange_order');
      assert.ok(res.newItemName.includes('cheeni'));
    });

    test('parses money-first sales (e.g. 20 ki chini, 50 ka chawal)', () => {
      const res1 = parseMoneyFirstSaleHeuristic('20 ki chini');
      assert.ok(res1);
      assert.equal(res1.targetAmount, 20);
      assert.equal(res1.itemName, 'chini');

      const res2 = parseMoneyFirstSaleHeuristic('70 ka doodh mila cash');
      assert.ok(res2);
      assert.equal(res2.targetAmount, 70);
      assert.equal(res2.itemName, 'doodh');
    });

    test('supports Pakistani retail fractional word numbers', () => {
      assert.equal(NUMBER_WORDS_MAP['pao'], 0.25);
      assert.equal(NUMBER_WORDS_MAP['aadha'], 0.5);
      assert.equal(NUMBER_WORDS_MAP['adha'], 0.5);
      assert.equal(NUMBER_WORDS_MAP['dedh'], 1.5);
      assert.equal(NUMBER_WORDS_MAP['sawa'], 1.25);
      assert.equal(NUMBER_WORDS_MAP['dhai'], 2.5);
      assert.equal(NUMBER_WORDS_MAP['paune'], 0.75);
    });
  });

  describe('Order Approval Defaults', () => {
    test('orders over 10k are completed by default when approval is not opted in', async () => {
      const merchantId = 'merchant_approval_test';

      const origInvFind = InventoryItem.findOne;
      InventoryItem.findOne = async () => ({
        _id: 'inv_oil',
        name: 'Oil 5L',
        price: 3000,
        quantity: 100,
        save: async () => {},
      });

      const origMerchantFind = Merchant.findById;
      Merchant.findById = () => ({
        lean: async () => ({ requireApprovalForHighValue: false, highValueThreshold: 10000 }),
      });

      let savedOrder = null;
      const origOrderCreate = Order.create;
      Order.create = async (data) => {
        savedOrder = data;
        return { ...data, _id: 'ord_123' };
      };

      try {
        await createOrder({
          merchantId,
          source: 'text',
          paymentMethod: 'cash',
          items: [{ name: 'Oil 5L', quantity: 5 }], // 5 * 3000 = 15,000 (> 10k)
        });

        assert.ok(savedOrder);
        assert.equal(savedOrder.total, 15000);
        // Must be completed because approval is OFF by default!
        assert.equal(savedOrder.status, 'completed');
      } finally {
        InventoryItem.findOne = origInvFind;
        Merchant.findById = origMerchantFind;
        Order.create = origOrderCreate;
      }
    });
  });

  describe('Return & Exchange Service Logic', () => {
    test('processOrderReturn restocks inventory and adjusts udhaar khata', async () => {
      const merchantId = 'merchant_test_1';
      let restockedQty = null;
      let customerNewBalance = null;

      const mockOrder = {
        _id: 'order_ret_1',
        merchantId,
        orderNumber: 'VT-1001',
        paymentMethod: 'udhaar',
        customerId: 'cust_soban',
        status: 'completed',
        items: [{ inventoryItemId: 'inv_rice', name: 'Rice', quantity: 2, price: 200 }],
        returnHistory: [],
        save: async function () { return this; },
      };

      const origOrderFindOne = Order.findOne;
      Order.findOne = async () => mockOrder;

      const origInvFindOne = InventoryItem.findOne;
      InventoryItem.findOne = async () => ({
        _id: 'inv_rice',
        name: 'Rice',
        price: 200,
        quantity: 10,
        save: async function () { restockedQty = this.quantity; },
      });

      const origCustFindOne = Customer.findOne;
      Customer.findOne = async () => ({
        _id: 'cust_soban',
        name: 'soban',
        balance: 400,
        save: async function () { customerNewBalance = this.balance; },
      });

      try {
        const result = await processOrderReturn(merchantId, {
          orderNumber: 'VT-1001',
          items: [{ name: 'Rice', quantity: 1 }],
          reason: 'Customer returned 1kg',
        });

        assert.ok(result);
        assert.equal(result.refundAmount, 200);
        // Stock: 10 + 1 = 11
        assert.equal(restockedQty, 11);
        // Customer Udhaar balance: 400 - 200 = 200
        assert.equal(customerNewBalance, 200);
        assert.equal(mockOrder.status, 'partially_returned');
      } finally {
        Order.findOne = origOrderFindOne;
        InventoryItem.findOne = origInvFindOne;
        Customer.findOne = origCustFindOne;
      }
    });

    test('processOrderExchange swaps item, deducts replacement, and calculates price difference', async () => {
      const merchantId = 'merchant_test_2';
      let returnRestockedQty = null;
      let newDeductedQty = null;
      let customerNewBalance = null;

      const mockOrder = {
        _id: 'order_exch_1',
        merchantId,
        orderNumber: 'VT-2002',
        paymentMethod: 'udhaar',
        customerId: 'cust_ali',
        status: 'completed',
        total: 200,
        items: [{ inventoryItemId: 'inv_rice', name: 'Rice', quantity: 1, price: 200 }],
        exchangeHistory: [],
        save: async function () { return this; },
      };

      const origOrderFindOne = Order.findOne;
      Order.findOne = async () => mockOrder;

      const origInvFindOne = InventoryItem.findOne;
      InventoryItem.findOne = async (query) => {
        const qStr = JSON.stringify(query).toLowerCase();
        if (qStr.includes('sugar') || query._id === 'inv_sugar') {
          return {
            _id: 'inv_sugar',
            name: 'Sugar',
            price: 250,
            quantity: 20,
            save: async function () { newDeductedQty = this.quantity; },
          };
        }
        return {
          _id: 'inv_rice',
          name: 'Rice',
          price: 200,
          quantity: 15,
          save: async function () { returnRestockedQty = this.quantity; },
        };
      };

      const origCustFindOne = Customer.findOne;
      Customer.findOne = async () => ({
        _id: 'cust_ali',
        name: 'ali',
        balance: 200,
        save: async function () { customerNewBalance = this.balance; },
      });

      try {
        const result = await processOrderExchange(merchantId, {
          orderNumber: 'VT-2002',
          returnItem: { name: 'Rice', quantity: 1 },
          newItem: { name: 'Sugar', quantity: 1 },
          reason: 'Customer wanted sugar instead',
        });

        assert.ok(result);
        // Rice restocked: 15 + 1 = 16
        assert.equal(returnRestockedQty, 16);
        // Sugar deducted: 20 - 1 = 19
        assert.equal(newDeductedQty, 19);
        // Price difference: 250 (Sugar) - 200 (Rice) = +50
        assert.equal(result.priceDifference, 50);
        // Customer Udhaar balance: 200 + 50 = 250
        assert.equal(customerNewBalance, 250);
        assert.equal(mockOrder.status, 'exchanged');
        assert.equal(mockOrder.total, 250);
      } finally {
        Order.findOne = origOrderFindOne;
        InventoryItem.findOne = origInvFindOne;
        Customer.findOne = origCustFindOne;
      }
    });
  });
});
