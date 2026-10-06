import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spokenPhrases } from '../src/services/localization.service.js';
import { createOrder } from '../src/crm/order.service.js';
import InventoryItem from '../src/models/InventoryItem.js';
import Customer from '../src/models/Customer.js';
import Order from '../src/models/Order.js';

describe('Udhaar / Khaata (Ledger) System Tests', () => {
  describe('Localization & Responses', () => {
    test('formats udhaar response correctly in Urdu with customerName', () => {
      const response = spokenPhrases.orderLogged('ur', {
        items: [{ name: 'Rice', quantity: 2 }],
        paymentMethod: 'udhaar',
        customerName: 'usman',
        orderNo: 'VT-123',
      });
      assert.ok(response.spoken.includes('usman کے کھاتے میں'));
      assert.ok(response.text.includes('(کھاتہ: usman)'));
      assert.ok(response.spoken.includes('ادھار / کھاتہ پر'));
    });

    test('formats udhaar response correctly in English with customerName', () => {
      const response = spokenPhrases.orderLogged('en', {
        items: [{ name: 'Sugar', quantity: 5 }],
        paymentMethod: 'udhaar',
        customerName: 'ali',
        orderNo: 'VT-456',
      });
      assert.ok(response.spoken.includes("added to ali's ledger"));
      assert.ok(response.text.includes('(Ledger: ali)'));
      assert.ok(response.spoken.includes('via Udhaar (Credit)'));
    });

    test('handles standard cash sale without customer name', () => {
      const response = spokenPhrases.orderLogged('ur', {
        items: [{ name: 'Milk', quantity: 1 }],
        paymentMethod: 'cash',
        orderNo: 'VT-789',
      });
      assert.ok(!response.spoken.includes('کے کھاتے میں'));
      assert.ok(!response.text.includes('(کھاتہ:'));
    });
  });

  describe('createOrder with Udhaar', () => {
    test('creates customer and adds balance when udhaar and customerName are provided', async () => {
      const merchantId = 'merchant_123';
      let savedInventoryItem = null;
      let createdCustomer = null;
      let savedCustomer = null;
      let createdOrder = null;

      // Mock InventoryItem.findOne
      const origInvFind = InventoryItem.findOne;
      InventoryItem.findOne = async () => {
        return {
          _id: 'inv_123',
          name: 'Rice',
          price: 200,
          quantity: 10,
          save: async function() { savedInventoryItem = this; }
        };
      };

      // Mock Customer
      const origCustFindOne = Customer.findOne;
      const origCustCreate = Customer.create;
      Customer.findOne = async () => null; // Simulate new customer
      Customer.create = async (data) => {
        const cust = { ...data, _id: 'cust_999', save: async function() { savedCustomer = this; } };
        createdCustomer = cust;
        return cust;
      };

      // Mock Order
      const origOrderCreate = Order.create;
      Order.create = async (data) => {
        createdOrder = data;
        return { ...data, _id: 'order_123' };
      };

      try {
        await createOrder({
          merchantId,
          source: 'text',
          paymentMethod: 'udhaar',
          customerName: 'Ahmad',
          items: [{ name: 'Rice', quantity: 2 }]
        });

        // Verify Inventory Deduction
        assert.equal(savedInventoryItem.quantity, 8);

        // Verify Customer Creation & Balance
        assert.ok(createdCustomer);
        assert.equal(createdCustomer.name, 'ahmad');
        assert.equal(savedCustomer.balance, 400);

        // Verify Order Payload
        assert.ok(createdOrder);
        assert.equal(createdOrder.paymentMethod, 'udhaar');
        assert.equal(createdOrder.customerName, 'ahmad');
        assert.equal(createdOrder.customerId, 'cust_999');
        assert.equal(createdOrder.total, 400);
      } finally {
        InventoryItem.findOne = origInvFind;
        Customer.findOne = origCustFindOne;
        Customer.create = origCustCreate;
        Order.create = origOrderCreate;
      }
    });

    test('updates existing customer balance when udhaar and customerName match', async () => {
      const merchantId = 'merchant_123';
      let savedCustomer = null;
      let createdOrder = null;

      const origInvFind = InventoryItem.findOne;
      InventoryItem.findOne = async () => {
        return { _id: 'inv_456', name: 'Milk', price: 150, quantity: 20, save: async () => {} };
      };

      const origCustFindOne = Customer.findOne;
      Customer.findOne = async ({ name }) => {
        if (name === 'ali') {
          return {
            _id: 'cust_ali',
            name: 'ali',
            balance: 500,
            save: async function() { savedCustomer = this; }
          };
        }
        return null;
      };

      const origOrderCreate = Order.create;
      Order.create = async (data) => {
        createdOrder = data;
        return { ...data, _id: 'order_124' };
      };

      try {
        await createOrder({
          merchantId,
          source: 'voice',
          paymentMethod: 'udhaar',
          customerName: ' Ali ', 
          items: [{ name: 'Milk', quantity: 3 }] 
        });

        assert.equal(savedCustomer.balance, 950); 
        assert.equal(createdOrder.customerId, 'cust_ali');
        assert.equal(createdOrder.customerName, 'ali');
      } finally {
        InventoryItem.findOne = origInvFind;
        Customer.findOne = origCustFindOne;
        Order.create = origOrderCreate;
      }
    });
  });
});
