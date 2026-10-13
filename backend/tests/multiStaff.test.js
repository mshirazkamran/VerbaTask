import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import Merchant from '../src/models/Merchant.js';
import Order from '../src/models/Order.js';
import {
  getStaffLimit,
  getStaffMembers,
  addStaffMember,
  removeStaffMember,
  regenerateShopCode,
} from '../src/controllers/merchant.controller.js';
import { handleIncomingMessage } from '../src/controllers/whatsapp.controller.js';

describe('Multi-Staff Shop Reference Code System Tests', () => {
  test('Merchant schema defaults include subscriptionTier pro, staffMembers, and shopCode path', () => {
    const merchant = new Merchant({
      whatsappNumber: '923001234567',
      email: 'owner@shop.pk',
      passwordHash: 'hashed123',
    });

    assert.equal(merchant.subscriptionTier, 'pro');
    assert.ok(Array.isArray(merchant.staffMembers));
    assert.equal(merchant.staffMembers.length, 0);
    assert.ok(merchant.schema.paths.shopCode);
    assert.ok(merchant.schema.paths.staffMembers);
  });

  test('getStaffLimit returns correct limit for each subscription tier', () => {
    assert.equal(getStaffLimit('free'), 1);
    assert.equal(getStaffLimit('starter'), 2);
    assert.equal(getStaffLimit('pro'), 5);
    assert.equal(getStaffLimit('enterprise'), 50);
    assert.equal(getStaffLimit('unknown'), 5);
  });

  test('getStaffMembers returns shop code, subscription tier, and staff list', async () => {
    const origFindById = Merchant.findById;
    const mockMerchant = {
      _id: 'merchant_123',
      businessName: 'Al-Madina Kiryana',
      shopCode: 'VT-4589',
      subscriptionTier: 'pro',
      staffMembers: [
        { _id: 'staff_1', name: 'Ali', whatsappNumber: '923111111111', active: true },
        { _id: 'staff_2', name: 'Bilal', whatsappNumber: '923222222222', active: false },
      ],
      save: async () => {},
    };

    Merchant.findById = () => Promise.resolve(mockMerchant);

    try {
      const req = { merchantId: 'merchant_123' };
      let statusCode = 0;
      let jsonBody = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonBody = data;
          return this;
        },
      };

      await getStaffMembers(req, res);
      assert.equal(statusCode, 200);
      assert.equal(jsonBody.success, true);
      assert.equal(jsonBody.data.shopCode, 'VT-4589');
      assert.equal(jsonBody.data.subscriptionTier, 'pro');
      assert.equal(jsonBody.data.staffLimit, 5);
      assert.equal(jsonBody.data.activeCount, 1);
      assert.equal(jsonBody.data.staffMembers.length, 2);
    } finally {
      Merchant.findById = origFindById;
    }
  });

  test('addStaffMember validates required fields and normalizes phone number', async () => {
    const origFindById = Merchant.findById;
    let saved = false;
    const mockMerchant = {
      _id: 'merchant_123',
      whatsappNumber: '923000000000',
      subscriptionTier: 'pro',
      staffMembers: [],
      save: async () => { saved = true; },
    };

    Merchant.findById = () => Promise.resolve(mockMerchant);

    try {
      // Missing name
      let res1 = { status: (c) => ({ json: (d) => ({ code: c, ...d }) }) };
      const out1 = await addStaffMember({ merchantId: 'merchant_123', body: { whatsappNumber: '03001234567' } }, res1);
      assert.equal(out1.code, 400);

      // Same as owner phone
      const out2 = await addStaffMember({ merchantId: 'merchant_123', body: { name: 'Owner', whatsappNumber: '03000000000' } }, res1);
      assert.equal(out2.code, 400);

      // Valid staff member
      let statusCode = 0;
      let jsonBody = null;
      const res2 = {
        status(c) { statusCode = c; return this; },
        json(d) { jsonBody = d; return this; },
      };
      await addStaffMember({ merchantId: 'merchant_123', body: { name: 'Hamza', whatsappNumber: '03129876543' } }, res2);
      assert.equal(statusCode, 201);
      assert.equal(saved, true);
      assert.equal(mockMerchant.staffMembers.length, 1);
      assert.equal(mockMerchant.staffMembers[0].name, 'Hamza');
      assert.equal(mockMerchant.staffMembers[0].whatsappNumber, '923129876543');
    } finally {
      Merchant.findById = origFindById;
    }
  });

  test('addStaffMember enforces subscription staff limits', async () => {
    const origFindById = Merchant.findById;
    const mockMerchant = {
      _id: 'merchant_123',
      whatsappNumber: '923000000000',
      subscriptionTier: 'free', // limit is 1
      staffMembers: [
        { _id: 'staff_1', name: 'Zeeshan', whatsappNumber: '923111111111', active: true },
      ],
      save: async () => {},
    };

    Merchant.findById = () => Promise.resolve(mockMerchant);

    try {
      let statusCode = 0;
      let jsonBody = null;
      const res = {
        status(c) { statusCode = c; return this; },
        json(d) { jsonBody = d; return this; },
      };

      await addStaffMember({ merchantId: 'merchant_123', body: { name: 'Second Staff', whatsappNumber: '03222222222' } }, res);
      assert.equal(statusCode, 403);
      assert.equal(jsonBody.error.code, 'UPGRADE_REQUIRED');
    } finally {
      Merchant.findById = origFindById;
    }
  });

  test('removeStaffMember removes staff by id', async () => {
    const origFindById = Merchant.findById;
    const mockMerchant = {
      _id: 'merchant_123',
      staffMembers: [
        { _id: { toString: () => 'staff_1' }, name: 'Ali', whatsappNumber: '923111111111' },
      ],
      save: async () => {},
    };
    mockMerchant.staffMembers.id = (id) => mockMerchant.staffMembers.find((s) => s._id.toString() === id);
    mockMerchant.staffMembers.pull = (id) => {
      mockMerchant.staffMembers = mockMerchant.staffMembers.filter((s) => s._id.toString() !== id.toString());
    };

    Merchant.findById = () => Promise.resolve(mockMerchant);

    try {
      let statusCode = 0;
      let jsonBody = null;
      const res = {
        status(c) { statusCode = c; return this; },
        json(d) { jsonBody = d; return this; },
      };

      await removeStaffMember({ merchantId: 'merchant_123', params: { staffId: 'staff_1' } }, res);
      assert.equal(statusCode, 200);
      assert.equal(mockMerchant.staffMembers.length, 0);
    } finally {
      Merchant.findById = origFindById;
    }
  });

  test('Order schema accepts staffName and staffPhone attribution', () => {
    const order = new Order({
      merchantId: '64d1234567890abcdef12345',
      orderNumber: 'VT-123456-789',
      paymentMethod: 'cash',
      source: 'text',
      total: 500,
      staffName: 'Kashif',
      staffPhone: '923001234567',
    });

    assert.equal(order.staffName, 'Kashif');
    assert.equal(order.staffPhone, '923001234567');
  });

  test('WhatsApp handleIncomingMessage allows assistant to join via shop code', async () => {
    const origFindOne = Merchant.findOne;
    let saved = false;

    const mockMerchant = {
      _id: 'merchant_123',
      whatsappNumber: '923001112233',
      businessName: 'Khan Kiryana Store',
      shopCode: 'VT-9999',
      subscriptionTier: 'pro',
      staffMembers: [],
      save: async () => { saved = true; },
    };

    Merchant.findOne = (query) => {
      if (query.shopCode || query.$or) return Promise.resolve(mockMerchant);
      return Promise.resolve(null);
    };

    try {
      const req = {
        body: {
          entry: [
            {
              changes: [
                {
                  value: {
                    messages: [
                      {
                        id: 'msg_join_test_001',
                        from: '923456789012',
                        text: { body: 'join VT-9999 Tariq' },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      };

      const res = { sendStatus: () => {} };

      await handleIncomingMessage(req, res);
      assert.equal(saved, true);
      assert.equal(mockMerchant.staffMembers.length, 1);
      assert.equal(mockMerchant.staffMembers[0].name, 'Tariq');
      assert.equal(mockMerchant.staffMembers[0].whatsappNumber, '923456789012');
      assert.equal(mockMerchant.staffMembers[0].addedBy, 'whatsapp_code');
    } finally {
      Merchant.findOne = origFindOne;
    }
  });
});
