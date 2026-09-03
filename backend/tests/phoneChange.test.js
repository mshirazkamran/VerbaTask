import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  requestPhoneChange,
  verifyPhoneChange,
} from '../src/controllers/merchant.controller.js';
import Merchant from '../src/models/Merchant.js';
import PhoneChangeVerification from '../src/models/PhoneChangeVerification.js';

describe('Merchant Phone Number Change & Verification Tests', () => {
  test('requestPhoneChange validates input presence and format', async () => {
    const req = { merchantId: 'm123', body: {} };
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

    await requestPhoneChange(req, res);
    assert.equal(statusCode, 400);
    assert.equal(jsonResponse.success, false);
    assert.ok(jsonResponse.error.message.includes('required'));
  });

  test('requestPhoneChange rejects identical current phone number', async () => {
    const originalFindById = Merchant.findById;
    Merchant.findById = () => Promise.resolve({
      _id: 'm123',
      whatsappNumber: '923001234567',
    });

    try {
      const req = { merchantId: 'm123', body: { newPhoneNumber: '03001234567' } };
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

      await requestPhoneChange(req, res);
      assert.equal(statusCode, 400);
      assert.equal(jsonResponse.success, false);
      assert.ok(jsonResponse.error.message.includes('already your current'));
    } finally {
      Merchant.findById = originalFindById;
    }
  });

  test('requestPhoneChange rejects phone number registered to another merchant', async () => {
    const originalFindById = Merchant.findById;
    const originalFindOne = Merchant.findOne;

    Merchant.findById = () => Promise.resolve({
      _id: 'm123',
      whatsappNumber: '923001234567',
    });

    Merchant.findOne = () => Promise.resolve({
      _id: 'other_merchant_456',
      whatsappNumber: '923009876543',
    });

    try {
      const req = { merchantId: 'm123', body: { newPhoneNumber: '03009876543' } };
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

      await requestPhoneChange(req, res);
      assert.equal(statusCode, 400);
      assert.equal(jsonResponse.success, false);
      assert.ok(jsonResponse.error.message.includes('already registered to another'));
    } finally {
      Merchant.findById = originalFindById;
      Merchant.findOne = originalFindOne;
    }
  });

  test('verifyPhoneChange updates phone number on valid OTP', async () => {
    const originalFindById = Merchant.findById;
    const originalFindOneMerchant = Merchant.findOne;
    const originalFindOneVerif = PhoneChangeVerification.findOne;

    let savedNumber = null;
    const mockMerchant = {
      _id: 'm123',
      whatsappNumber: '923001112233',
      save: function () {
        savedNumber = this.whatsappNumber;
        return Promise.resolve();
      },
    };

    let markedUsed = false;
    const mockVerif = {
      merchantId: 'm123',
      newWhatsappNumber: '923007778899',
      code: '887766',
      expiresAt: new Date(Date.now() + 600000),
      usedAt: null,
      save: function () {
        markedUsed = !!this.usedAt;
        return Promise.resolve();
      },
    };

    Merchant.findById = () => Promise.resolve(mockMerchant);
    Merchant.findOne = () => Promise.resolve(null); // No conflict
    PhoneChangeVerification.findOne = () => Promise.resolve(mockVerif);

    try {
      const req = {
        merchantId: 'm123',
        body: {
          newPhoneNumber: '03007778899',
          code: '887766',
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

      await verifyPhoneChange(req, res);
      assert.equal(statusCode, 200);
      assert.equal(jsonResponse.success, true);
      assert.equal(savedNumber, '923007778899');
      assert.equal(markedUsed, true);
    } finally {
      Merchant.findById = originalFindById;
      Merchant.findOne = originalFindOneMerchant;
      PhoneChangeVerification.findOne = originalFindOneVerif;
    }
  });
});
