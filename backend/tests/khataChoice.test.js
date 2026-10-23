import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { rankKhataCustomers, pickKhataCandidate } from '../src/services/khata.service.js';
import { parseIntent } from '../src/services/qwen.service.js';
import { createOrderViaCrm, handleKhataSettle, handleIncomingMessage, __setTestSender } from '../src/controllers/whatsapp.controller.js';
import Customer from '../src/models/Customer.js';
import ConversationState from '../src/models/ConversationState.js';
import InventoryItem from '../src/models/InventoryItem.js';
import KhataPayment from '../src/models/KhataPayment.js';
import Merchant from '../src/models/Merchant.js';
import Order from '../src/models/Order.js';
import Workflow from '../src/models/Workflow.js';

const ALI_BHAI = { _id: 'c_ali_bhai', name: 'ali bhai', balance: 4140 };
const ALI_TOWN = { _id: 'c_ali_town', name: 'ali sheikhy town wala', balance: 0 };
const SOBAN = { _id: 'c_soban', name: 'soban bhai', balance: 500 };
const KHATAS = [ALI_BHAI, ALI_TOWN, SOBAN];

describe('rankKhataCustomers: which khata does a spoken name mean?', () => {
  const decide = (name) => {
    const { match, candidates } = rankKhataCustomers(KHATAS, name);
    return match ? match.name : candidates.map((c) => c.name);
  };

  it('asks when two khatas share the name ("ali")', () => {
    assert.deepEqual(decide('ali'), ['ali bhai', 'ali sheikhy town wala']);
    assert.deepEqual(decide('Ali'), ['ali bhai', 'ali sheikhy town wala']);
  });

  it('goes straight through on an exact, unambiguous name', () => {
    assert.equal(decide('ali bhai'), 'ali bhai');
    assert.equal(decide('ALI SHEIKHY TOWN WALA'), 'ali sheikhy town wala');
    assert.equal(decide('soban'), 'soban bhai');
  });

  it('asks, best match first, when the name is close but not exact', () => {
    assert.deepEqual(decide('ali shikhy town'), ['ali sheikhy town wala', 'ali bhai']);
    assert.deepEqual(decide('ali sheikhy bhai'), ['ali sheikhy town wala', 'ali bhai']);
    assert.deepEqual(decide('sobaan'), ['soban bhai']);
  });

  it('returns nothing for a name with no khata', () => {
    assert.deepEqual(decide('usman'), []);
  });
});

describe('pickKhataCandidate: reading the merchant\'s answer', () => {
  const both = [{ id: 'c_ali_bhai', name: 'ali bhai' }, { id: 'c_ali_town', name: 'ali sheikhy town wala' }];
  it('accepts a number or a name', () => {
    assert.equal(pickKhataCandidate(both, '2').id, 'c_ali_town');
    assert.equal(pickKhataCandidate(both, '1').id, 'c_ali_bhai');
    assert.equal(pickKhataCandidate(both, 'Ali sheikhy bhai').id, 'c_ali_town');
    assert.equal(pickKhataCandidate(both, 'ali bhai').id, 'c_ali_bhai');
  });
  it('does not guess when the answer is still ambiguous or unrelated', () => {
    assert.equal(pickKhataCandidate(both, 'ali'), null);
    assert.equal(pickKhataCandidate(both, '2 doodh cash'), null);
  });
});

describe('Udhaar names from voice transcripts are kept whole', () => {
  before(() => { for (const k of ['GROQ_API_KEY', 'GEMINI_API_KEY', 'DASHSCOPE_API_KEY']) delete process.env[k]; });
  it('"udhaar pe ali sheikhy bhai ko diay" -> name "ali sheikhy bhai", item just "sufi oil"', async () => {
    const r = await parseIntent('2 sufi oil udhaar pe ali sheikhy bhai ko diay');
    assert.equal(r.customerName, 'ali sheikhy bhai');
    assert.deepEqual(r.items.map((i) => [i.name, i.quantity]), [['sufi oil', 2]]);
  });
  it('"Ali shikhy town ko ... udhar pe diay" -> name "ali shikhy town"', async () => {
    const r = await parseIntent('Ali shikhy town ko 4 sufi oil aur 3 dahi udhar pe diay');
    assert.equal(r.customerName, 'ali shikhy town');
    assert.deepEqual(r.items.map((i) => [i.name, i.quantity]), [['sufi oil', 4], ['dahi', 3]]);
  });
});

describe('WhatsApp: confirm the khata before anything is recorded', () => {
  const merchant = { _id: 'merchant_1', whatsappNumber: '923000000000', language: 'en', voiceReplies: false, onboardingComplete: true, staffMembers: [], save: async () => {} };
  const originals = [];
  const mock = (obj, key, fn) => { originals.push([obj, key, obj[key]]); obj[key] = fn; };
  const listOf = (items) => { const arr = [...items]; arr.limit = async () => arr; return arr; };

  let texts;
  let interactive;
  let state;
  let orders;
  let payments;
  let msgSeq = 0;

  const incomingText = (body) => handleIncomingMessage({
    body: { entry: [{ changes: [{ value: { messages: [{ id: `wamid.test.${++msgSeq}`, from: merchant.whatsappNumber, type: 'text', text: { body } }] } }] }] },
  }, { sendStatus: () => {} });
  const incomingTap = (id) => handleIncomingMessage({
    body: { entry: [{ changes: [{ value: { messages: [{ id: `wamid.test.${++msgSeq}`, from: merchant.whatsappNumber, type: 'interactive', interactive: { type: 'button_reply', button_reply: { id } } }] } }] }] },
  }, { sendStatus: () => {} });

  before(() => {
    mock(axios, 'create', () => ({ post: async (_url, body) => { if (body?.type === 'interactive') interactive.push(body.interactive); return { data: { messages: [{ id: 'wamid.out' }] } }; } }));
    mock(Customer, 'find', () => listOf(KHATAS));
    mock(Customer, 'findOne', async (q) => {
      if (q._id) return KHATAS.find((c) => c._id === q._id) ? { ...KHATAS.find((c) => c._id === q._id), save: async function () { Object.assign(KHATAS.find((c) => c._id === q._id), { balance: this.balance }); } } : null;
      const hit = KHATAS.find((c) => (q.name instanceof RegExp ? q.name.test(c.name) : c.name === q.name));
      return hit ? { ...hit, save: async function () { hit.balance = this.balance; } } : null;
    });
    mock(ConversationState, 'findOneAndUpdate', async (_q, update) => { state = { _id: 'state_1', ...update, updatedAt: new Date() }; return state; });
    mock(ConversationState, 'findOne', async (q) => (state && (!q.flow || q.flow === state.flow) ? state : null));
    mock(ConversationState, 'deleteOne', async () => { state = null; });
    mock(InventoryItem, 'findOne', async () => ({ _id: 'inv_oil', name: 'Sufi Oil', price: 600, quantity: 50, save: async () => {} }));
    mock(Merchant, 'findOne', async (q) => (q.whatsappNumber ? merchant : null));
    mock(Merchant, 'findById', () => ({ lean: async () => ({ requireApprovalForHighValue: false }) }));
    mock(Order, 'create', async (data) => { orders.push(data); return { ...data, _id: `o${orders.length}`, save: async () => {} }; });
    mock(KhataPayment, 'create', async (data) => { payments.push(data); return data; });
    mock(Workflow, 'find', async () => []);
    __setTestSender(null, async (_to, text) => { texts.push(text); return { messages: [{ id: 'wamid.1' }] }; });
  });
  after(() => {
    for (const [obj, key, fn] of originals.reverse()) obj[key] = fn;
    __setTestSender(null, null);
  });
  beforeEach(() => { texts = []; interactive = []; state = null; orders = []; payments = []; ALI_BHAI.balance = 4140; ALI_TOWN.balance = 0; });

  const sale = (customerName) => createOrderViaCrm(merchant, {
    merchantId: 'merchant_1', items: [{ name: 'sufi oil', quantity: 2 }], paymentMethod: 'udhaar', customerName, source: 'text', language: 'en',
  });

  it('"ali" with two Ali khatas: asks with both, records nothing', async () => {
    await sale('ali');
    assert.equal(orders.length, 0);
    assert.equal(state.flow, 'customer_disambiguation');
    const buttons = interactive[0].action.buttons.map((b) => b.reply.title);
    assert.deepEqual(buttons, ['ali bhai', 'ali sheikhy town wa…', 'None of these']);
    assert.match(interactive[0].body.text, /ALI SHEIKHY TOWN WALA/);
    assert.match(interactive[0].body.text, /Which khata\?/);
    assert.doesNotMatch(JSON.stringify(interactive[0]), /New Customer/);
  });

  it('a typed answer ("Ali sheikhy bhai") picks the khata and logs the sale there', async () => {
    await sale('ali');
    await incomingText('Ali sheikhy bhai');
    assert.equal(orders.length, 1);
    assert.equal(orders[0].customerName, 'ali sheikhy town wala');
    assert.equal(ALI_TOWN.balance, 1200);
    assert.equal(ALI_BHAI.balance, 4140, 'the other Ali is untouched');
  });

  it('tapping a button logs the sale on that khata', async () => {
    await sale('ali');
    await incomingTap('custpick_c_ali_bhai');
    assert.equal(orders.length, 1);
    assert.equal(orders[0].customerName, 'ali bhai');
  });

  it('"None of these" records nothing', async () => {
    await sale('ali');
    await incomingTap('custpick_none');
    assert.equal(orders.length, 0);
    assert.match(texts.at(-1), /no khata/i);
  });

  it('an exact name goes straight through without asking', async () => {
    await sale('ali bhai');
    assert.equal(interactive.length, 0);
    assert.equal(orders.length, 1);
    assert.equal(orders[0].customerName, 'ali bhai');
  });

  it('a khata payment from "ali" also asks first, then applies to the chosen khata', async () => {
    await handleKhataSettle(merchant, 'ali', 1000, 'text');
    assert.equal(payments.length, 0);
    assert.equal(state.data.action, 'settle');
    await incomingText('1');
    assert.equal(payments.length, 1);
    assert.equal(ALI_BHAI.balance, 3140);
  });
});
