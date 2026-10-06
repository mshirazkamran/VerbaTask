import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getCustomers, settleBalance } from '../src/controllers/customer.controller.js';
import Customer from '../src/models/Customer.js';

describe('Customer Controller Tests', () => {
  test('getCustomers returns list of customers sorted by balance', async () => {
    let mockResponse = {};
    const req = { merchantId: 'merchant_123' };
    const res = {
      json: (data) => { mockResponse = data; },
      status: () => res
    };

    const origFind = Customer.find;
    Customer.find = (query) => {
      assert.equal(query.merchantId, 'merchant_123');
      return {
        sort: (sortObj) => {
          assert.equal(sortObj.balance, -1);
          return [
            { name: 'ali', balance: 500 },
            { name: 'usman', balance: 200 }
          ];
        }
      };
    };

    try {
      await getCustomers(req, res);
      assert.equal(mockResponse.success, true);
      assert.equal(mockResponse.data.length, 2);
      assert.equal(mockResponse.data[0].name, 'ali');
    } finally {
      Customer.find = origFind;
    }
  });

  test('settleBalance reduces customer balance correctly', async () => {
    let mockResponse = {};
    const req = {
      merchantId: 'merchant_123',
      params: { id: 'cust_abc' },
      body: { amount: 300 }
    };
    const res = {
      json: (data) => { mockResponse = data; },
      status: () => res
    };

    let savedCustomer = null;
    const origFindOne = Customer.findOne;
    Customer.findOne = async (query) => {
      assert.equal(query._id, 'cust_abc');
      assert.equal(query.merchantId, 'merchant_123');
      return {
        _id: 'cust_abc',
        balance: 500,
        save: async function() { savedCustomer = this; }
      };
    };

    try {
      await settleBalance(req, res);
      assert.equal(mockResponse.success, true);
      assert.equal(mockResponse.data.balance, 200);
      assert.equal(savedCustomer.balance, 200);
    } finally {
      Customer.findOne = origFindOne;
    }
  });

  test('settleBalance returns 400 for invalid amount', async () => {
    let mockResponse = {};
    let statusCode = 200;
    const req = { body: { amount: -50 } };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { mockResponse = data; }
    };

    await settleBalance(req, res);
    assert.equal(statusCode, 400);
    assert.equal(mockResponse.success, false);
  });
});
