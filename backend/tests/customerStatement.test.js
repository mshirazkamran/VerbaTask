import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  createCustomer,
  updateCustomer,
  getCustomerStatement,
} from '../src/controllers/customer.controller.js';
import Customer from '../src/models/Customer.js';
import Order from '../src/models/Order.js';
import KhataPayment from '../src/models/KhataPayment.js';

const mockRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  return res;
};

describe('Dashboard khata rules and statement', () => {
  const orig = {
    findOne: Customer.findOne,
    create: Customer.create,
    orderFind: Order.find,
    paymentFind: KhataPayment.find,
  };

  afterEach(() => {
    Customer.findOne = orig.findOne;
    Customer.create = orig.create;
    Order.find = orig.orderFind;
    KhataPayment.find = orig.paymentFind;
  });

  test('createCustomer refuses to open a khata without a phone number', async () => {
    let created = false;
    Customer.create = async () => { created = true; return {}; };
    const res = mockRes();

    await createCustomer({ merchantId: 'm1', body: { name: 'Talal' } }, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.error.message, /mobile number/);
    assert.equal(created, false);
  });

  test('createCustomer refuses an invalid phone number', async () => {
    const res = mockRes();
    await createCustomer({ merchantId: 'm1', body: { name: 'Talal', phone: '12345' } }, res);
    assert.equal(res.statusCode, 400);
  });

  test('createCustomer stores the phone in one normalized form', async () => {
    let created = null;
    Customer.findOne = async () => null;
    Customer.create = async (doc) => { created = doc; return { _id: 'c1', ...doc }; };
    const res = mockRes();

    await createCustomer({ merchantId: 'm1', body: { name: 'Talal', phone: '+92 300 1234567' } }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(created.phone, '03001234567');
    assert.equal(created.name, 'talal');
  });

  test('createCustomer refuses a phone number that already belongs to another khata', async () => {
    let created = false;
    Customer.findOne = async (q) => (q.phone ? { _id: 'c9', name: 'rashid', phone: q.phone } : null);
    Customer.create = async () => { created = true; return {}; };
    const res = mockRes();

    await createCustomer({ merchantId: 'm1', body: { name: 'Talal', phone: '03001234567' } }, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.error.message, /rashid/);
    assert.equal(created, false);
  });

  test('updateCustomer rejects an invalid phone number', async () => {
    Customer.findOne = async () => ({ _id: 'c1', name: 'talal', phone: '03001234567', balance: 0, save: async () => {} });
    const res = mockRes();

    await updateCustomer({ merchantId: 'm1', params: { id: 'c1' }, body: { phone: '999' } }, res);

    assert.equal(res.statusCode, 400);
  });

  test('getCustomerStatement returns dated purchases with items, payments and the running balance', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    Customer.findOne = async (q) => {
      assert.equal(String(q._id), id);
      assert.equal(q.merchantId, 'm1');
      return { _id: id, name: 'talal', phone: '03001234567', balance: 800, createdAt: '2026-10-01T00:00:00Z' };
    };
    Order.find = () => ({
      sort: async () => [
        { createdAt: '2026-10-20T10:00:00Z', total: 900, orderNumber: 'VT-1', status: 'completed', items: [{ name: 'Lipton Yellow Label', quantity: 2 }] },
      ],
    });
    KhataPayment.find = () => ({ sort: async () => [{ createdAt: '2026-10-21T10:00:00Z', amount: 100 }] });
    const res = mockRes();

    await getCustomerStatement({ merchantId: 'm1', params: { id } }, res);

    assert.equal(res.body.success, true);
    const { customer, rows, totals } = res.body.data;
    assert.equal(customer.name, 'talal');
    assert.deepEqual(rows.map((r) => [r.type, r.balance]), [['purchase', 900], ['payment', 800]]);
    assert.match(rows[0].details, /2x Lipton Yellow Label/);
    assert.deepEqual(totals, { purchased: 900, paid: 100, balance: 800, purchaseCount: 1 });
  });

  test('getCustomerStatement rejects a malformed id without querying', async () => {
    let queried = false;
    Customer.findOne = async () => { queried = true; return null; };
    const res = mockRes();

    await getCustomerStatement({ merchantId: 'm1', params: { id: 'not-an-id' } }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(queried, false);
  });
});
