import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getProfile,
  updateProfile,
  getPaymentMethods,
  updatePaymentMethods,
} from '../src/controllers/merchant.controller.js';
import Merchant from '../src/models/Merchant.js';

describe('Merchant Profiling & Settings Module Tests', () => {
  test('Merchant schema defaults include standard Pakistani payment methods', () => {
    const merchant = new Merchant({
      whatsappNumber: '+923001112233',
      email: 'test@merchant.pk',
      passwordHash: 'hashedpassword',
    });

    assert.ok(Array.isArray(merchant.acceptedPaymentMethods));
    assert.deepEqual(merchant.acceptedPaymentMethods, ['cash', 'easypaisa', 'jazzcash']);
    assert.equal(merchant.voiceReplies, true);
    assert.equal(merchant.replyPreference, 'voice_on_voice');
  });

  test('updateProfile rejects invalid payment methods', async () => {
    const req = {
      merchantId: '64d1234567890abcdef12345',
      body: {
        acceptedPaymentMethods: ['cash', 'fake_unsupported_wallet'],
      },
    };

    let statusCode = 0;
    let jsonResponse = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      },
    };

    await updateProfile(req, res);
    assert.equal(statusCode, 400);
    assert.equal(jsonResponse.success, false);
    assert.ok(jsonResponse.error.message.includes('not recognized in Pakistan catalog'));
  });

  test('updateProfile normalizes aliases like "sada pay" and "meezan bank"', async () => {
    // Mock Merchant.findByIdAndUpdate
    const originalFindByIdAndUpdate = Merchant.findByIdAndUpdate;
    let capturedUpdates = null;

    Merchant.findByIdAndUpdate = (id, update) => {
      capturedUpdates = update.$set;
      return {
        select() {
          return Promise.resolve({
            _id: id,
            businessName: capturedUpdates.businessName || 'My Kiryana',
            acceptedPaymentMethods: capturedUpdates.acceptedPaymentMethods,
          });
        },
      };
    };

    try {
      const req = {
        merchantId: '64d1234567890abcdef12345',
        body: {
          businessName: 'Khan Kiryana & General Store',
          acceptedPaymentMethods: ['cash', 'sada pay', 'meezan bank', 'نیا پے'],
        },
      };

      let statusCode = 0;
      let jsonResponse = null;

      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonResponse = data;
          return this;
        },
      };

      await updateProfile(req, res);
      assert.equal(statusCode, 200);
      assert.equal(jsonResponse.success, true);
      assert.equal(capturedUpdates.businessName, 'Khan Kiryana & General Store');
      assert.deepEqual(capturedUpdates.acceptedPaymentMethods, ['cash', 'sadapay', 'meezan', 'nayapay']);
    } finally {
      Merchant.findByIdAndUpdate = originalFindByIdAndUpdate;
    }
  });

  test('getPaymentMethods returns catalog with active flags for merchant', async () => {
    const originalFindById = Merchant.findById;

    Merchant.findById = (id) => ({
      select() {
        return Promise.resolve({
          _id: id,
          acceptedPaymentMethods: ['cash', 'sadapay', 'meezan'],
          paymentDetails: {
            sadapay: { accountTitle: 'Soban Iftikhar', iban: 'PK12SADA0000001234567890' },
          },
        });
      },
    });

    try {
      const req = { merchantId: '64d1234567890abcdef12345' };
      let statusCode = 0;
      let jsonResponse = null;

      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonResponse = data;
          return this;
        },
      };

      await getPaymentMethods(req, res);
      assert.equal(statusCode, 200);
      assert.equal(jsonResponse.success, true);
      assert.equal(jsonResponse.data.totalActive, 3);
      assert.deepEqual(jsonResponse.data.activeMethods, ['cash', 'sadapay', 'meezan']);

      const sadapayMethod = jsonResponse.data.methods.find((m) => m.id === 'sadapay');
      assert.ok(sadapayMethod);
      assert.equal(sadapayMethod.active, true);
      assert.equal(sadapayMethod.nameUrdu, 'سادا پے');

      const hblMethod = jsonResponse.data.methods.find((m) => m.id === 'hbl');
      assert.ok(hblMethod);
      assert.equal(hblMethod.active, false);
    } finally {
      Merchant.findById = originalFindById;
    }
  });

  test('updatePaymentMethods updates active methods and validates list', async () => {
    const originalFindByIdAndUpdate = Merchant.findByIdAndUpdate;

    Merchant.findByIdAndUpdate = (id, update) => ({
      select() {
        return Promise.resolve({
          _id: id,
          acceptedPaymentMethods: update.$set.acceptedPaymentMethods,
          paymentDetails: update.$set.paymentDetails,
        });
      },
    });

    try {
      const req = {
        merchantId: '64d1234567890abcdef12345',
        body: {
          acceptedPaymentMethods: ['cash', 'raast', 'hbl', 'sadapay'],
        },
      };

      let statusCode = 0;
      let jsonResponse = null;

      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonResponse = data;
          return this;
        },
      };

      await updatePaymentMethods(req, res);
      assert.equal(statusCode, 200);
      assert.equal(jsonResponse.success, true);
      assert.deepEqual(jsonResponse.data.acceptedPaymentMethods, ['cash', 'raast', 'hbl', 'sadapay']);
    } finally {
      Merchant.findByIdAndUpdate = originalFindByIdAndUpdate;
    }
  });
});
