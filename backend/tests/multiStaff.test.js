import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import Merchant from '../src/models/Merchant.js';
import Order from '../src/models/Order.js';
import ConversationState from '../src/models/ConversationState.js';
import InventoryItem from '../src/models/InventoryItem.js';
import {
  getStaffLimit,
  getStaffMembers,
  addStaffMember,
  removeStaffMember,
  disableShop,
} from '../src/controllers/merchant.controller.js';
import { handleIncomingMessage } from '../src/controllers/whatsapp.controller.js';
import { extractPackagedVariant } from '../src/services/qwen.service.js';
import { deliverReport } from '../src/services/reportDelivery.service.js';

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

  test('WhatsApp handleIncomingMessage does NOT let an unknown number join via shop code', async () => {
    const origFindOne = Merchant.findOne;
    const origFindOneState = ConversationState.findOne;
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

    ConversationState.findOne = async () => null;

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
      // Staff are added only by the owner from the dashboard.
      assert.equal(saved, false);
      assert.equal(mockMerchant.staffMembers.length, 0);
    } finally {
      Merchant.findOne = origFindOne;
      ConversationState.findOne = origFindOneState;
    }
  });

  test('disableShop soft-disables store and unlinks phone number and email', async () => {
    const origFindById = Merchant.findById;
    let saved = false;
    const clearedCookies = [];

    const mockMerchant = {
      _id: 'merchant_disable_123',
      businessName: 'Ideal Bakery',
      whatsappNumber: '923053331098',
      email: 'ideal@bakery.pk',
      status: 'active',
      staffMembers: [
        { _id: 's1', name: 'Zeeshan', whatsappNumber: '923001234567', active: true },
      ],
      save: async () => { saved = true; },
    };

    Merchant.findById = () => Promise.resolve(mockMerchant);

    try {
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
        clearCookie(cookieName) {
          clearedCookies.push(cookieName);
        },
      };

      await disableShop({ merchantId: 'merchant_disable_123' }, res);

      assert.equal(statusCode, 200);
      assert.equal(jsonBody.success, true);
      assert.equal(saved, true);
      assert.equal(mockMerchant.status, 'disabled');
      assert.equal(mockMerchant.unlinkedWhatsappNumber, '923053331098');
      assert.equal(mockMerchant.unlinkedEmail, 'ideal@bakery.pk');
      assert.ok(mockMerchant.whatsappNumber.startsWith('unlinked_'));
      assert.ok(mockMerchant.email.startsWith('unlinked_'));
      assert.equal(mockMerchant.staffMembers[0].active, false);
      assert.ok(clearedCookies.includes('boldukan_session'));
      assert.ok(clearedCookies.includes('boldukan_merchant_id'));
    } finally {
      Merchant.findById = origFindById;
    }
  });

  test('extractPackagedVariant preserves packaged size in name instead of loose stock quantity', () => {
    // Packaged item with variant size
    const p1 = extractPackagedVariant('lipton yellow lable 300gm waali');
    assert.equal(p1.pkgVariant, '300gm');
    assert.ok(p1.processed.includes('__PKG_SIZE__'));

    const p2 = extractPackagedVariant('everyday doodh 1kg pack');
    assert.equal(p2.pkgVariant, '1kg');

    const p3 = extractPackagedVariant('shan biryani masala 50g dabba');
    assert.equal(p3.pkgVariant, '50g');

    // Loose commodity should NOT be treated as a packaged size variant
    const loose = extractPackagedVariant('5 kg chini');
    assert.equal(loose.pkgVariant, null);
    assert.equal(loose.processed, '5 kg chini');

    const looseRice = extractPackagedVariant('2 kg chawal');
    assert.equal(looseRice.pkgVariant, null);
  });

  test('handleIncomingMessage routes assistant replies and isolated ConversationState strictly to assistant and not owner', async () => {
    const origFindOne = Merchant.findOne;
    const origCount = InventoryItem.countDocuments;
    const origFind = InventoryItem.find;
    const origFindOneState = ConversationState.findOne;
    const origUpsertState = ConversationState.findOneAndUpdate;
    const origCreateAxios = axios.create;

    const ownerPhone = '923001112233';
    const assistantPhone = '923456789012';

    const mockMerchant = {
      _id: '507f191e810c19729de860ea',
      whatsappNumber: ownerPhone,
      businessName: 'Al Sheikh General Store',
      shopCode: 'VT-8888',
      subscriptionTier: 'pro',
      language: 'ur',
      onboardingComplete: true,
      staffMembers: [
        { name: 'Hamza Assistant', whatsappNumber: assistantPhone, active: true },
      ],
      save: async () => {},
    };

    const sentRequests = [];
    axios.create = () => ({
      post: async (url, data) => {
        sentRequests.push({ url, data });
        return { data: { messages: [{ id: 'mock_msg_id' }] } };
      },
    });

    const conversationStatesUpserted = [];
    ConversationState.findOneAndUpdate = async (query, update, opts) => {
      conversationStatesUpserted.push({ query, update, opts });
      return null;
    };
    ConversationState.findOne = async () => null;
    InventoryItem.countDocuments = async () => 2;
    InventoryItem.find = () => ({
      sort: () => ({
        limit: async () => [
          { _id: 'i1', name: 'Dal Mash', price: 200, quantity: 10 },
          { _id: 'i2', name: 'Sugar', price: 150, quantity: 50 },
        ],
      }),
      limit: async () => [
        { _id: 'i1', name: 'Dal Mash', price: 200, quantity: 10 },
        { _id: 'i2', name: 'Sugar', price: 150, quantity: 50 },
      ],
    });

    Merchant.findOne = (query) => {
      if (query['staffMembers.whatsappNumber']) {
        return Promise.resolve(mockMerchant);
      }
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
                        id: 'msg_assistant_order_01',
                        from: assistantPhone,
                        type: 'text',
                        text: { body: 'order' },
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

      // Verify ConversationState was keyed on the assistant's phone number!
      assert.ok(conversationStatesUpserted.length > 0);
      assert.equal(conversationStatesUpserted[0].query.whatsappNumber, assistantPhone);
      assert.notEqual(conversationStatesUpserted[0].query.whatsappNumber, ownerPhone);

      // Verify the outbound WhatsApp message was sent to assistant's phone!
      assert.ok(sentRequests.length > 0);
      const outboundRecipient = sentRequests[0].data?.to;
      assert.equal(outboundRecipient, assistantPhone);
      assert.notEqual(outboundRecipient, ownerPhone);
    } finally {
      Merchant.findOne = origFindOne;
      InventoryItem.countDocuments = origCount;
      InventoryItem.find = origFind;
      ConversationState.findOne = origFindOneState;
      ConversationState.findOneAndUpdate = origUpsertState;
      axios.create = origCreateAxios;
    }
  });

  test('deliverReport routes announcements and PDF document to merchant._replyToNumber when set', async () => {
    const origCreateAxios = axios.create;
    const origFind = InventoryItem.find;
    const ownerPhone = '923001112233';
    const assistantPhone = '923456789012';

    InventoryItem.find = () => ({
      sort: () => ({
        limit: async () => [],
      }),
      limit: async () => [],
    });

    const sentRequests = [];
    axios.create = () => ({
      post: async (url, data) => {
        sentRequests.push({ url, data });
        return { data: { id: 'media_mock_id', messages: [{ id: 'mock_doc_id' }] } };
      },
    });

    const mockMerchant = {
      _id: '507f191e810c19729de860ea',
      businessName: 'Al Sheikh Store',
      whatsappNumber: ownerPhone,
      _replyToNumber: assistantPhone,
      language: 'en',
    };

    try {
      await deliverReport(mockMerchant, 'inventory', 'en', { announce: true });

      assert.ok(sentRequests.length >= 1);
      // All outbound messages should target assistantPhone, NEVER ownerPhone
      for (const req of sentRequests) {
        if (req.data?.to) {
          assert.equal(req.data.to, assistantPhone);
          assert.notEqual(req.data.to, ownerPhone);
        }
      }
    } finally {
      axios.create = origCreateAxios;
      InventoryItem.find = origFind;
    }
  });

  test('handleIncomingMessage processes transfer rejection (replying 2): marks staff member as rejected, notifies owner on WhatsApp, and emits dashboard update', async () => {
    const origFindById = Merchant.findById;
    const origFindOne = ConversationState.findOne;
    const origDeleteMany = ConversationState.deleteMany;
    const origCreateAxios = axios.create;

    const ownerPhone = '923001112233';
    const assistantPhone = '923456789012';
    const newShopId = '507f191e810c19729de860ea';
    const oldShopId = '507f191e810c19729de860eb';

    let savedNewShop = false;
    const newShop = {
      _id: newShopId,
      businessName: 'Al Sheikh Store',
      whatsappNumber: ownerPhone,
      staffMembers: [
        {
          _id: 'staff_entry_1',
          name: 'Soban',
          whatsappNumber: assistantPhone,
          active: false,
          status: 'pending_switch',
        },
      ],
      save: async () => { savedNewShop = true; },
    };

    const oldShop = {
      _id: oldShopId,
      businessName: 'Ideal Bakery',
      whatsappNumber: '923009998877',
      staffMembers: [
        {
          _id: 'staff_old_1',
          name: 'Soban',
          whatsappNumber: assistantPhone,
          active: true,
          status: 'active',
        },
      ],
      save: async () => {},
    };

    const mockPendingState = {
      _id: 'state_123',
      whatsappNumber: assistantPhone,
      flow: 'pending_staff_transfer',
      data: {
        newShopId,
        oldShopId,
        oldRole: 'staff',
        staffName: 'Soban',
        newShopName: 'Al Sheikh Store',
        oldShopName: 'Ideal Bakery',
      },
    };

    let deletedStates = [];
    ConversationState.findOne = async () => mockPendingState;
    ConversationState.deleteMany = async (query) => {
      deletedStates.push(query);
      return { deletedCount: 1 };
    };

    Merchant.findById = async (id) => {
      if (String(id) === newShopId) return newShop;
      if (String(id) === oldShopId) return oldShop;
      return null;
    };

    const sentRequests = [];
    axios.create = () => ({
      post: async (url, data) => {
        sentRequests.push({ url, data });
        return { data: { messages: [{ id: 'mock_msg_id' }] } };
      },
    });

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
                        id: 'msg_reject_01',
                        from: assistantPhone,
                        type: 'text',
                        text: { body: '2' },
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

      // Verify new shop staff record was marked rejected
      assert.ok(savedNewShop, 'New shop should be saved with rejected status');
      const staffMember = newShop.staffMembers.find((s) => s.whatsappNumber === assistantPhone);
      assert.ok(staffMember);
      assert.equal(staffMember.active, false);
      assert.equal(staffMember.status, 'rejected');

      // Verify ConversationState was cleared
      assert.ok(deletedStates.length > 0, 'Pending conversation state should be cleared');

      // Verify outbound messages:
      // 1 to the owner notifying of rejection, 1 to assistant confirming they stayed
      const ownerMessage = sentRequests.find((r) => r.data?.to === ownerPhone);
      assert.ok(ownerMessage, 'Owner should receive rejection WhatsApp notification');
      assert.ok(ownerMessage.data.text.body.includes('mustarad'), 'Owner message should state the request was rejected');

      const assistantMessage = sentRequests.find((r) => r.data?.to === assistantPhone);
      assert.ok(assistantMessage, 'Assistant should receive confirmation WhatsApp message');
      assert.ok(assistantMessage.data.text.body.includes('Ideal Bakery'), 'Assistant message should confirm staying with old shop');
    } finally {
      Merchant.findById = origFindById;
      ConversationState.findOne = origFindOne;
      ConversationState.deleteMany = origDeleteMany;
      axios.create = origCreateAxios;
    }
  });
});
