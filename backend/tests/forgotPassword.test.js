import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  requestPasswordReset,
  resendPasswordResetCode,
  resetPassword,
} from '../src/controllers/auth.controller.js';
import Merchant from '../src/models/Merchant.js';
import PasswordResetCode from '../src/models/PasswordResetCode.js';

describe('Forgot Password & Rate Limiting Tests', () => {
  test('requestPasswordReset validates input presence', async () => {
    const req = { body: {} };
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

    await requestPasswordReset(req, res);
    assert.equal(statusCode, 400);
    assert.equal(jsonResponse.success, false);
    assert.ok(jsonResponse.error.message.includes('Email or WhatsApp number is required'));
  });

  test('requestPasswordReset rejects unknown merchants', async () => {
    const originalFindOne = Merchant.findOne;
    Merchant.findOne = () => Promise.resolve(null);

    try {
      const req = { body: { identifier: 'nonexistent@example.com' } };
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

      await requestPasswordReset(req, res);
      assert.equal(statusCode, 404);
      assert.equal(jsonResponse.success, false);
      assert.ok(jsonResponse.error.message.includes('No account found'));
    } finally {
      Merchant.findOne = originalFindOne;
    }
  });

  test('enforces rate limit of maximum 3 requests per hour', async () => {
    const originalMerchantFindOne = Merchant.findOne;
    const originalResetFindOne = PasswordResetCode.findOne;

    const mockMerchant = {
      _id: '64d1234567890abcdef12345',
      email: 'test@merchant.pk',
      whatsappNumber: '923001234567',
    };

    Merchant.findOne = () => Promise.resolve(mockMerchant);

    // Mock 3 recent requests in the last 20 minutes
    const now = Date.now();
    const mockResetRecord = {
      merchantId: mockMerchant._id,
      whatsappNumber: mockMerchant.whatsappNumber,
      code: '123456',
      expiresAt: new Date(now + 600000),
      requestHistory: [
        new Date(now - 25 * 60 * 1000), // 25 mins ago
        new Date(now - 15 * 60 * 1000), // 15 mins ago
        new Date(now - 5 * 60 * 1000),  // 5 mins ago
      ],
      save: () => Promise.resolve(),
    };

    PasswordResetCode.findOne = () => Promise.resolve(mockResetRecord);

    try {
      const req = { body: { identifier: 'test@merchant.pk' } };
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

      await requestPasswordReset(req, res);
      assert.equal(statusCode, 429, 'Expected HTTP 429 Rate Limit Exceeded');
      assert.equal(jsonResponse.success, false);
      assert.ok(jsonResponse.error.message.includes('Rate limit exceeded'));
      assert.ok(jsonResponse.error.retryAfterMinutes > 0);
    } finally {
      Merchant.findOne = originalMerchantFindOne;
      PasswordResetCode.findOne = originalResetFindOne;
    }
  });

  test('resetPassword verifies code and updates password', async () => {
    const originalMerchantFindOne = Merchant.findOne;
    const originalResetFindOne = PasswordResetCode.findOne;

    let savedPasswordHash = null;
    const mockMerchant = {
      _id: '64d1234567890abcdef12345',
      email: 'test@merchant.pk',
      whatsappNumber: '923001234567',
      passwordHash: 'oldhash',
      save: function () {
        savedPasswordHash = this.passwordHash;
        return Promise.resolve();
      },
    };

    let markedUsed = false;
    const mockResetRecord = {
      merchantId: mockMerchant._id,
      code: '654321',
      expiresAt: new Date(Date.now() + 600000), // not expired
      usedAt: null,
      save: function () {
        markedUsed = !!this.usedAt;
        return Promise.resolve();
      },
    };

    Merchant.findOne = () => Promise.resolve(mockMerchant);
    PasswordResetCode.findOne = () => Promise.resolve(mockResetRecord);

    try {
      const req = {
        body: {
          identifier: 'test@merchant.pk',
          code: '654321',
          newPassword: 'newsecurepassword123',
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

      await resetPassword(req, res);
      assert.equal(statusCode, 200);
      assert.equal(jsonResponse.success, true);
      assert.ok(savedPasswordHash && savedPasswordHash !== 'oldhash');
      assert.equal(markedUsed, true);
    } finally {
      Merchant.findOne = originalMerchantFindOne;
      PasswordResetCode.findOne = originalResetFindOne;
    }
  });

  test('resetPassword rejects expired or incorrect codes', async () => {
    const originalMerchantFindOne = Merchant.findOne;
    const originalResetFindOne = PasswordResetCode.findOne;

    const mockMerchant = {
      _id: '64d1234567890abcdef12345',
      email: 'test@merchant.pk',
      whatsappNumber: '923001234567',
    };

    const mockExpiredRecord = {
      merchantId: mockMerchant._id,
      code: '654321',
      expiresAt: new Date(Date.now() - 1000), // expired 1 sec ago
      usedAt: null,
    };

    Merchant.findOne = () => Promise.resolve(mockMerchant);
    PasswordResetCode.findOne = () => Promise.resolve(mockExpiredRecord);

    try {
      const req = {
        body: {
          identifier: 'test@merchant.pk',
          code: '654321',
          newPassword: 'newsecurepassword123',
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

      await resetPassword(req, res);
      assert.equal(statusCode, 400);
      assert.equal(jsonResponse.success, false);
      assert.ok(jsonResponse.error.message.includes('expired'));
    } finally {
      Merchant.findOne = originalMerchantFindOne;
      PasswordResetCode.findOne = originalResetFindOne;
    }
  });
});
