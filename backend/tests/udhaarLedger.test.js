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
    test('refuses an udhaar sale when the customer has no khata, without creating one or touching stock', async () => {
      const merchantId = 'merchant_123';
      let stockSaved = false;
      let customerCreated = false;
      let orderCreated = false;

      const origInvFind = InventoryItem.findOne;
      InventoryItem.findOne = async () => ({
        _id: 'inv_123',
        name: 'Rice',
        price: 200,
        quantity: 10,
        save: async () => { stockSaved = true; },
      });

      const origCustFindOne = Customer.findOne;
      const origCustCreate = Customer.create;
      Customer.findOne = async () => null; // no khata exists
      Customer.create = async () => { customerCreated = true; return {}; };

      const origOrderCreate = Order.create;
      Order.create = async () => { orderCreated = true; return {}; };

      try {
        await assert.rejects(
          createOrder({
            merchantId,
            source: 'text',
            paymentMethod: 'udhaar',
            customerName: 'Ahmad',
            items: [{ name: 'Rice', quantity: 2 }],
          }),
          /KHATA_NOT_FOUND/
        );

        assert.equal(customerCreated, false, 'a sale must never open a khata');
        assert.equal(stockSaved, false, 'stock must not be deducted for a refused sale');
        assert.equal(orderCreated, false);
      } finally {
        InventoryItem.findOne = origInvFind;
        Customer.findOne = origCustFindOne;
        Customer.create = origCustCreate;
        Order.create = origOrderCreate;
      }
    });

    test('refuses an udhaar sale that names no customer', async () => {
      const origInvFind = InventoryItem.findOne;
      let stockSaved = false;
      InventoryItem.findOne = async () => ({
        _id: 'inv_123', name: 'Rice', price: 200, quantity: 10, save: async () => { stockSaved = true; },
      });

      try {
        await assert.rejects(
          createOrder({
            merchantId: 'merchant_123',
            source: 'text',
            paymentMethod: 'udhaar',
            items: [{ name: 'Rice', quantity: 1 }],
          }),
          /KHATA_NAME_REQUIRED/
        );
        assert.equal(stockSaved, false);
      } finally {
        InventoryItem.findOne = origInvFind;
      }
    });

    test('adds the sale to an existing khata and creates no new customer', async () => {
      const merchantId = 'merchant_123';
      let savedInventoryItem = null;
      let savedCustomer = null;
      let createdOrder = null;
      let customerCreated = false;

      const origInvFind = InventoryItem.findOne;
      InventoryItem.findOne = async () => ({
        _id: 'inv_123',
        name: 'Rice',
        price: 200,
        quantity: 10,
        save: async function() { savedInventoryItem = this; },
      });

      const origCustFindOne = Customer.findOne;
      const origCustCreate = Customer.create;
      Customer.findOne = async ({ name }) =>
        name === 'ahmad'
          ? { _id: 'cust_999', name: 'ahmad', balance: 100, save: async function() { savedCustomer = this; } }
          : null;
      Customer.create = async () => { customerCreated = true; return {}; };

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
          items: [{ name: 'Rice', quantity: 2 }],
        });

        assert.equal(savedInventoryItem.quantity, 8);
        assert.equal(customerCreated, false);
        assert.equal(savedCustomer.balance, 500); // 100 owed before + 2 x 200
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
