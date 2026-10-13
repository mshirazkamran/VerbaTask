import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  settleBalance,
} from '../src/controllers/customer.controller.js';
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

  test('createCustomer creates a new customer entry', async () => {
    let mockResponse = {};
    let statusCode = 200;
    const req = {
      merchantId: 'merchant_123',
      body: { name: 'Hamza', phone: '03001234567', balance: 1500 }
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { mockResponse = data; }
    };

    const origFindOne = Customer.findOne;
    const origCreate = Customer.create;

    Customer.findOne = async () => null; // No duplicate
    Customer.create = async (doc) => ({
      _id: 'cust_new',
      ...doc
    });

    try {
      await createCustomer(req, res);
      assert.equal(statusCode, 201);
      assert.equal(mockResponse.success, true);
      assert.equal(mockResponse.data.name, 'hamza');
      assert.equal(mockResponse.data.balance, 1500);
    } finally {
      Customer.findOne = origFindOne;
      Customer.create = origCreate;
    }
  });

  test('updateCustomer modifies existing customer details', async () => {
    let mockResponse = {};
    const req = {
      merchantId: 'merchant_123',
      params: { id: 'cust_123' },
      body: { name: 'Hamza Updated', balance: 2000 }
    };
    const res = {
      status: () => res,
      json: (data) => { mockResponse = data; }
    };

    const origFindOne = Customer.findOne;
    let callCount = 0;
    Customer.findOne = async (query) => {
      callCount++;
      if (callCount === 1) {
        return {
          _id: 'cust_123',
          merchantId: 'merchant_123',
          name: 'hamza',
          balance: 1500,
          save: async function() {}
        };
      }
      return null; // No name collision
    };

    try {
      await updateCustomer(req, res);
      assert.equal(mockResponse.success, true);
      assert.equal(mockResponse.data.name, 'hamza updated');
      assert.equal(mockResponse.data.balance, 2000);
    } finally {
      Customer.findOne = origFindOne;
    }
  });

  test('deleteCustomer removes customer from ledger', async () => {
    let mockResponse = {};
    const req = {
      merchantId: 'merchant_123',
      params: { id: 'cust_123' }
    };
    const res = {
      status: () => res,
      json: (data) => { mockResponse = data; }
    };

    const origFindOneAndDelete = Customer.findOneAndDelete;
    Customer.findOneAndDelete = async (query) => ({
      _id: query._id,
      name: 'hamza'
    });

    try {
      await deleteCustomer(req, res);
      assert.equal(mockResponse.success, true);
      assert.equal(mockResponse.message, 'Customer deleted from ledger');
    } finally {
      Customer.findOneAndDelete = origFindOneAndDelete;
    }
  });
});

