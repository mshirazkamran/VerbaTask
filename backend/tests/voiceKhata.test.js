import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { handleIncomingMessage, __setTestSender } from '../src/controllers/whatsapp.controller.js';
import { devanagariToRoman } from '../src/services/transliteration.service.js';
import Customer from '../src/models/Customer.js';
import ConversationState from '../src/models/ConversationState.js';
import InventoryItem from '../src/models/InventoryItem.js';
import KhataPayment from '../src/models/KhataPayment.js';
import Merchant from '../src/models/Merchant.js';
import Order from '../src/models/Order.js';
import Workflow from '../src/models/Workflow.js';

describe('Devanagari transcripts', () => {
  it('become Roman Urdu the parsers read', () => {
    assert.equal(devanagariToRoman('अली ने 400 रुपये वापस कर दिए'), 'ali ne 400 rupaye wapas kar die');
    assert.equal(devanagariToRoman('अली के खाते में दो सूफी ऑयल डाल दो'), 'ali ke khate men do sufi oyal dal do');
    assert.equal(devanagariToRoman('सोबान भाई ने ५०० दिए'), 'soban bhai ne 500 die');
  });
});

describe('Udhaar khata by voice note (download -> Whisper -> parse -> khata)', () => {
  const merchant = { _id: 'merchant_v', whatsappNumber: '923111111111', language: 'ur', voiceReplies: false, onboardingComplete: true, staffMembers: [], save: async () => {} };
  const KHATAS = [
    { _id: 'c_ali_bhai', name: 'ali bhai', balance: 4140 },
    { _id: 'c_ali_town', name: 'ali sheikhy town wala', balance: 1200 },
    { _id: 'c_soban', name: 'soban bhai', balance: 500 },
  ];
  const originals = [];
  const mock = (obj, key, fn) => { originals.push([obj, key, obj[key]]); obj[key] = fn; };
  const listOf = (items) => { const arr = [...items]; arr.limit = async () => arr; return arr; };
  const chain = (value) => ({ select: () => ({ lean: async () => value }), lean: async () => value });

  let transcript;
  let texts;
  let interactive;
  let state;
  let orders;
  let payments;
  let seq = 0;
  const savedGroq = process.env.GROQ_API_KEY;

  const voiceNote = () => handleIncomingMessage({
    body: { entry: [{ changes: [{ value: { messages: [{ id: `wamid.voice.${++seq}`, from: merchant.whatsappNumber, type: 'audio', audio: { id: `media_${seq}` } }] } }] }] },
  }, { sendStatus: () => {} });
  const tap = (id) => handleIncomingMessage({
    body: { entry: [{ changes: [{ value: { messages: [{ id: `wamid.voice.${++seq}`, from: merchant.whatsappNumber, type: 'interactive', interactive: { type: 'button_reply', button_reply: { id } } }] } }] }] },
  }, { sendStatus: () => {} });

  before(() => {
    process.env.GROQ_API_KEY = 'test-key';
    for (const k of ['GEMINI_API_KEY', 'DASHSCOPE_API_KEY']) delete process.env[k];
    // Meta media download + Groq Whisper
    mock(axios, 'get', async (url) => (url.includes('graph.facebook.com') ? { data: { url: 'https://media.test/voice.ogg', mime_type: 'audio/ogg' } } : { data: Buffer.from('fake-ogg'), headers: {} }));
    mock(axios, 'post', async (url) => {
      if (url.includes('audio/transcriptions')) return { data: { text: transcript } };
      throw new Error(`unexpected POST ${url}`);
    });
    mock(axios, 'create', () => ({ post: async (_u, body) => { if (body?.type === 'interactive') interactive.push(body.interactive); return { data: { messages: [{ id: 'wamid.out' }] } }; } }));

    const doc = (c) => ({ ...c, save: async function () { c.balance = this.balance; } });
    mock(Customer, 'find', () => listOf(KHATAS.map(doc)));
    mock(Customer, 'findOne', async (q) => {
      const hit = q._id ? KHATAS.find((c) => c._id === q._id) : KHATAS.find((c) => (q.name instanceof RegExp ? q.name.test(c.name) : c.name === q.name));
      return hit ? doc(hit) : null;
    });
    mock(ConversationState, 'findOneAndUpdate', async (_q, update) => { state = { _id: 'state_v', ...update, updatedAt: new Date() }; return state; });
    mock(ConversationState, 'findOne', async (q) => (state && (!q.flow || q.flow === state.flow) ? state : null));
    mock(ConversationState, 'deleteOne', async () => { state = null; });
    mock(InventoryItem, 'find', () => chain([{ name: 'Sufi Oil', aliases: [], price: 600, unit: 'bottle', quantity: 50 }]));
    mock(InventoryItem, 'findOne', async () => ({ _id: 'inv_oil', name: 'Sufi Oil', price: 600, quantity: 50, save: async () => {} }));
    mock(Merchant, 'findOne', async (q) => (q.whatsappNumber ? merchant : null));
    mock(Merchant, 'findById', () => chain({ businessName: 'Test Store', businessType: 'kiryana', requireApprovalForHighValue: false }));
    mock(Order, 'create', async (data) => { orders.push(data); return { ...data, _id: `o${orders.length}`, save: async () => {} }; });
    mock(KhataPayment, 'create', async (data) => { payments.push(data); return data; });
    mock(Workflow, 'find', async () => []);
    __setTestSender(async (_to, opts) => { texts.push(opts.textReceipt || opts.spokenText); return {}; }, async (_to, text) => { texts.push(text); return {}; });
  });
  after(() => {
    for (const [obj, key, fn] of originals.reverse()) obj[key] = fn;
    __setTestSender(null, null);
    if (savedGroq === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = savedGroq;
  });
  beforeEach(() => {
    texts = []; interactive = []; state = null; orders = []; payments = [];
    KHATAS[0].balance = 4140; KHATAS[1].balance = 1200; KHATAS[2].balance = 500;
  });

  it('Urdu-script payment to a khata with one match is applied directly', async () => {
    transcript = 'سوبان بھائی نے 300 روپے واپس کر دیے ہیں۔';
    await voiceNote();
    assert.equal(payments.length, 1);
    assert.equal(payments[0].amount, 300);
    assert.equal(KHATAS[2].balance, 200);
  });

  it('Hindi-script payment from "ali" asks which Ali, then a spoken "doosra" applies it', async () => {
    transcript = 'अली ने 400 रुपये वापस कर दिए';
    await voiceNote();
    assert.equal(payments.length, 0, 'nothing deducted before choosing');
    assert.equal(state.data.action, 'settle');
    transcript = 'دوسرا';
    await voiceNote();
    assert.equal(payments.length, 1);
    assert.equal(KHATAS[1].balance, 800);
    assert.equal(KHATAS[0].balance, 4140);
  });

  it('Whisper commas don\'t turn a payment into a return', async () => {
    transcript = 'Soban bhai ne, 200 rupay wapis kar diye, udhaar se.';
    await voiceNote();
    assert.equal(payments.length, 1);
    assert.equal(KHATAS[2].balance, 300);
  });

  it('Urdu-script udhaar sale goes on the khata after a tap', async () => {
    transcript = 'علی کو ادھار پر دو سوفی آئل دے دیے ہیں۔';
    await voiceNote();
    assert.equal(orders.length, 0);
    await tap('custpick_c_ali_town');
    assert.equal(orders.length, 1);
    assert.equal(orders[0].customerName, 'ali sheikhy town wala');
    assert.equal(orders[0].items[0].quantity, 2);
    assert.equal(KHATAS[1].balance, 2400);
  });
});
