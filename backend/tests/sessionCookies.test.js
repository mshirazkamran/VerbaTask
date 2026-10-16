import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../src/middleware/requireAuth.js';
import { login, signup, logout } from '../src/controllers/auth.controller.js';
import Merchant from '../src/models/Merchant.js';
import bcrypt from 'bcryptjs';

describe('Session Tokens & Cookie Authentication Tests', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_123';
  process.env.JWT_SECRET = JWT_SECRET;

  test('requireAuth authenticates via Authorization Bearer header', () => {
    const merchantId = 'merchant_header_123';
    const token = jwt.sign({ merchantId }, JWT_SECRET);

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    let nextCalled = false;
    const res = {};

    requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.merchantId, merchantId);
  });

  test('requireAuth authenticates via Cookie boldukan_session header', () => {
    const merchantId = 'merchant_boldukan_cookie_123';
    const token = jwt.sign({ merchantId }, JWT_SECRET);

    const req = {
      headers: {
        cookie: `other_pref=dark; boldukan_session=${token}; lang=en`,
      },
    };
    let nextCalled = false;
    const res = {};

    requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.merchantId, merchantId);
  });

  test('requireAuth authenticates via Cookie vt_session header', () => {
    const merchantId = 'merchant_cookie_456';
    const token = jwt.sign({ merchantId }, JWT_SECRET);

    const req = {
      headers: {
        cookie: `other_pref=dark; vt_session=${token}; lang=en`,
      },
    };
    let nextCalled = false;
    const res = {};

    requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.merchantId, merchantId);
  });

  test('requireAuth authenticates via Cookie verbatask_token fallback', () => {
    const merchantId = 'merchant_legacy_cookie_789';
    const token = jwt.sign({ merchantId }, JWT_SECRET);

    const req = {
      headers: {
        cookie: `verbatask_token=${token}`,
      },
    };
    let nextCalled = false;
    const res = {};

    requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.merchantId, merchantId);
  });

  test('requireAuth returns 401 when no token is present in header or cookies', () => {
    const req = { headers: {} };
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

    let nextCalled = false;
    requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(statusCode, 401);
    assert.equal(jsonResponse.success, false);
    assert.equal(jsonResponse.error.message, 'Missing token');
  });

  test('requireAuth returns 401 on invalid token in cookies', () => {
    const req = {
      headers: {
        cookie: 'vt_session=invalid.token.payload',
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

    let nextCalled = false;
    requireAuth(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(statusCode, 401);
    assert.equal(jsonResponse.success, false);
    assert.equal(jsonResponse.error.message, 'Invalid or expired token');
  });

  test('login sets vt_session and vt_merchant_id cookies', async () => {
    const originalFindOne = Merchant.findOne;
    const originalCompare = bcrypt.compare;

    const fakeMerchant = {
      _id: 'merchant_login_test_1',
      email: 'owner@kiryana.com',
      passwordHash: 'hashed_pw',
    };

    Merchant.findOne = async () => fakeMerchant;
    bcrypt.compare = async () => true;

    try {
      const cookiesSet = {};
      const req = {
        body: {
          email: 'owner@kiryana.com',
          password: 'password123',
        },
      };
      let statusCode = 0;
      let responseBody = null;
      const res = {
        cookie(name, value, options) {
          cookiesSet[name] = { value, options };
          return this;
        },
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          responseBody = data;
          return this;
        },
      };

      await login(req, res);

      assert.equal(statusCode, 200);
      assert.equal(responseBody.success, true);
      assert.ok(responseBody.data.token);
      assert.equal(responseBody.data.merchantId, 'merchant_login_test_1');

      assert.ok(cookiesSet.boldukan_session);
      assert.equal(cookiesSet.boldukan_session.value, responseBody.data.token);
      assert.equal(cookiesSet.boldukan_session.options.path, '/');
      assert.equal(cookiesSet.boldukan_session.options.sameSite, 'lax');

      assert.ok(cookiesSet.boldukan_merchant_id);
      assert.equal(cookiesSet.boldukan_merchant_id.value, 'merchant_login_test_1');

      assert.ok(cookiesSet.vt_session);
      assert.equal(cookiesSet.vt_session.value, responseBody.data.token);
      assert.equal(cookiesSet.vt_session.options.path, '/');
      assert.equal(cookiesSet.vt_session.options.sameSite, 'lax');

      assert.ok(cookiesSet.vt_merchant_id);
      assert.equal(cookiesSet.vt_merchant_id.value, 'merchant_login_test_1');
    } finally {
      Merchant.findOne = originalFindOne;
      bcrypt.compare = originalCompare;
    }
  });

  test('signup sets vt_session and vt_merchant_id cookies', async () => {
    const originalFindOne = Merchant.findOne;
    const originalCreate = Merchant.create;
    const originalHash = bcrypt.hash;

    Merchant.findOne = async () => null; // No existing merchant
    Merchant.create = async (data) => ({
      _id: 'merchant_signup_test_2',
      ...data,
    });
    bcrypt.hash = async () => 'mock_hashed_pw';

    try {
      const cookiesSet = {};
      const req = {
        body: {
          email: 'newowner@kiryana.com',
          password: 'password123',
        },
      };
      let statusCode = 0;
      let responseBody = null;
      const res = {
        cookie(name, value, options) {
          cookiesSet[name] = { value, options };
          return this;
        },
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          responseBody = data;
          return this;
        },
      };

      await signup(req, res);

      assert.equal(statusCode, 201);
      assert.equal(responseBody.success, true);
      assert.ok(responseBody.data.token);
      assert.equal(responseBody.data.merchantId, 'merchant_signup_test_2');

      assert.ok(cookiesSet.boldukan_session);
      assert.equal(cookiesSet.boldukan_session.value, responseBody.data.token);
      assert.ok(cookiesSet.boldukan_merchant_id);
      assert.equal(cookiesSet.boldukan_merchant_id.value, 'merchant_signup_test_2');

      assert.ok(cookiesSet.vt_session);
      assert.equal(cookiesSet.vt_session.value, responseBody.data.token);
      assert.ok(cookiesSet.vt_merchant_id);
      assert.equal(cookiesSet.vt_merchant_id.value, 'merchant_signup_test_2');
    } finally {
      Merchant.findOne = originalFindOne;
      Merchant.create = originalCreate;
      bcrypt.hash = originalHash;
    }
  });

  test('logout clears vt_session and vt_merchant_id cookies', async () => {
    const cookiesCleared = [];
    const req = {};
    let statusCode = 0;
    let responseBody = null;
    const res = {
      clearCookie(name, options) {
        cookiesCleared.push({ name, options });
        return this;
      },
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };

    await logout(req, res);

    assert.equal(statusCode, 200);
    assert.equal(responseBody.success, true);
    assert.deepEqual(
      cookiesCleared.map((c) => c.name),
      ['boldukan_session', 'boldukan_merchant_id', 'vt_session', 'vt_merchant_id']
    );
  });
});
