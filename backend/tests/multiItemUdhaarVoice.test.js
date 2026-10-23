import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseIntent,
  parseStandardSaleHeuristic,
  splitSaleItems,
  extractUdhaarCustomer,
} from '../src/services/qwen.service.js';
import { createOrder } from '../src/crm/order.service.js';
import InventoryItem from '../src/models/InventoryItem.js';
import Customer from '../src/models/Customer.js';
import Order from '../src/models/Order.js';

// Voice transcripts of multi-item udhaar sales, as Whisper actually writes them. Run with no LLM
// keys so every case must be handled by the rule-based parsers (never silently by an LLM).
const LLM_KEYS = ['GROQ_API_KEY', 'GEMINI_API_KEY', 'DASHSCOPE_API_KEY'];
const savedKeys = {};

const RICE_SUGAR_MILK = [['chawal', 2], ['chini', 1], ['doodh', 3]];
const names = (r) => r.items.map((i) => [i.name, i.quantity]);

describe('Multi-item udhaar voice sales', () => {
  before(() => {
    for (const k of LLM_KEYS) { savedKeys[k] = process.env[k]; delete process.env[k]; }
  });
  after(() => {
    for (const k of LLM_KEYS) { if (savedKeys[k] !== undefined) process.env[k] = savedKeys[k]; }
  });

  const cases = [
    ['Ali ko udhaar 2 kilo chawal 1 kilo chini 3 doodh', 'ali'],
    ['Ali ko 2 kilo chawal 1 kilo chini 3 doodh udhaar pe de diya.', 'ali'],
    ['2 kilo chawal. 1 kilo chini. 3 doodh. Ali ke khate mein.', 'ali'],
    ['Ali ke khate mein 2 kilo chawal 1 kilo chini 3 doodh daal do', 'ali'],
    ['Ali ke khate mein 2 kilo chawal, 1 kilo chini aur 3 doodh daal do.', 'ali'],
    ['2 kilo chawal or 1 kilo chini or 3 doodh udhaar ali', 'ali'],
    ['Udhar Ali, 2 kilo chawal, 1 kilo chini, 3 doodh', 'ali'],
  ];
  for (const [transcript, customer] of cases) {
    it(`keeps every item and the customer: "${transcript}"`, async () => {
      const r = await parseIntent(transcript);
      assert.equal(r.type, 'log_sale');
      assert.deepEqual(names(r), RICE_SUGAR_MILK);
      assert.equal(r.paymentMethod, 'udhaar');
      assert.equal(r.customerName, customer);
    });
  }

  it('reads Urdu-script udhaar (ادھار) instead of booking it as cash', async () => {
    const r = await parseIntent('دو کلو چاول، ایک کلو چینی، تین دودھ علی کے ادھار میں');
    assert.deepEqual(names(r), [['چاول', 2], ['چینی', 1], ['دودھ', 3]]);
    assert.equal(r.paymentMethod, 'udhaar');
    assert.equal(r.customerName, 'علی');
  });

  it('reads "علی کو ادھار ..." with the customer before the items', async () => {
    const r = await parseIntent('علی کو ادھار دو کلو چاول اور تین دودھ');
    assert.deepEqual(names(r), [['چاول', 2], ['دودھ', 3]]);
    assert.equal(r.paymentMethod, 'udhaar');
    assert.equal(r.customerName, 'علی');
  });

  it('charges the khata the sum of every spoken line amount, not just the first', async () => {
    const r = await parseIntent('2 chawal 300, 3 doodh 450 udhaar ali');
    assert.equal(r.amount, 750);
  });

  it('leaves the total to inventory prices when only some lines have an amount', () => {
    const r = parseStandardSaleHeuristic('2 chawal 300, 3 doodh udhaar ali');
    assert.equal(r.amount, null);
  });

  it('keeps every item in a money-first list ("100 ki chini aur 2 doodh")', async () => {
    const r = await parseIntent('100 ki chini aur 2 doodh udhaar ali');
    assert.equal(r.items.length, 2);
    assert.equal(r.items[0].targetAmount, 100);
    assert.equal(r.customerName, 'ali');
  });

  it('marks udhaar without a name so the bot asks whose khata it is', () => {
    const r = parseStandardSaleHeuristic('udhaar 2 chawal');
    assert.equal(r.paymentMethod, 'udhaar');
    assert.equal(r.customerName, null);
  });

  it('defers to the LLM instead of dropping an item it cannot read', () => {
    assert.equal(parseStandardSaleHeuristic('2 doodh aur chawal'), null);
  });
});

describe('Multi-item udhaar voice sale -> khata (end to end, mocked DB)', () => {
  const VOICE_NOTE = 'Ali ko udhaar 2 kilo chawal 1 kilo chini 3 doodh';
  const stock = {
    chawal: { _id: 'inv_chawal', name: 'chawal', price: 300, quantity: 50 },
    chini: { _id: 'inv_chini', name: 'chini', price: 160, quantity: 50 },
    doodh: { _id: 'inv_doodh', name: 'doodh', price: 220, quantity: 50 },
  };
  const mocks = {};

  before(() => {
    for (const k of LLM_KEYS) delete process.env[k];
    mocks.invFindOne = InventoryItem.findOne;
    mocks.custFindOne = Customer.findOne;
    mocks.custCreate = Customer.create;
    mocks.orderCreate = Order.create;
    // Exact-name lookup: createOrder queries { $or: [{ name: /^chawal$/i }, { aliases }] }
    InventoryItem.findOne = async (q) => {
      const re = q?.$or?.[0]?.name;
      const hit = Object.values(stock).find((s) => re instanceof RegExp && re.test(s.name));
      return hit ? { ...hit, save: async function () { hit.saved = this.quantity; } } : null;
    };
  });
  after(() => {
    InventoryItem.findOne = mocks.invFindOne;
    Customer.findOne = mocks.custFindOne;
    Customer.create = mocks.custCreate;
    Order.create = mocks.orderCreate;
    for (const k of LLM_KEYS) { if (savedKeys[k] !== undefined) process.env[k] = savedKeys[k]; }
  });

  it('is refused when Ali has no khata yet: no khata opened, no stock touched', async () => {
    let customerCreated = false;
    let orderCreated = false;
    Customer.findOne = async () => null;
    Customer.create = async () => { customerCreated = true; return {}; };
    Order.create = async () => { orderCreated = true; return {}; };

    const intent = await parseIntent(VOICE_NOTE);
    await assert.rejects(
      createOrder({ merchantId: 'merchant_1', source: 'voice', ...intent }),
      /KHATA_NOT_FOUND/
    );
    assert.equal(customerCreated, false, 'a sale must never open a khata');
    assert.equal(orderCreated, false);
    assert.ok(Object.values(stock).every((s) => s.saved === undefined), 'stock must not be deducted');
  });

  it('adds all three items to the khata once it exists', async () => {
    let savedCustomer = null;
    let createdOrder = null;
    Customer.findOne = async ({ name }) =>
      name === 'ali'
        ? { _id: 'cust_ali', name: 'ali', phone: '03001234567', balance: 100, save: async function () { savedCustomer = this; } }
        : null;
    Customer.create = async () => { throw new Error('must not create a customer'); };
    Order.create = async (data) => { createdOrder = data; return { ...data, _id: 'order_1' }; };

    const intent = await parseIntent(VOICE_NOTE);
    await createOrder({ merchantId: 'merchant_1', source: 'voice', ...intent });

    assert.deepEqual(createdOrder.items.map((i) => [i.name, i.quantity]), [['chawal', 2], ['chini', 1], ['doodh', 3]]);
    assert.equal(createdOrder.total, 2 * 300 + 160 + 3 * 220);
    assert.equal(createdOrder.paymentMethod, 'udhaar');
    assert.equal(createdOrder.customerId, 'cust_ali');
    assert.equal(savedCustomer.balance, 100 + 1420);
  });
});

describe('Sale item splitting', () => {
  it('splits items with no separators on quantity boundaries', () => {
    assert.deepEqual(splitSaleItems('2 kg chawal 1 kg chini 3 doodh'), ['2 kg chawal', '1 kg chini', '3 doodh']);
  });

  it('keeps a trailing price with its item', () => {
    assert.deepEqual(splitSaleItems('2 chawal 300 3 doodh 450'), ['2 chawal 300', '3 doodh 450']);
  });

  it('does not split decimals, "Rs." or packaged sizes', () => {
    assert.deepEqual(splitSaleItems('1.5 kg chini'), ['1.5 kg chini']);
    assert.deepEqual(splitSaleItems('2 chawal rs. 300'), ['2 chawal rs. 300']);
    assert.deepEqual(splitSaleItems('2 lipton 300 gm waali'), ['2 lipton 300 gm waali']);
  });

  it('keeps fractional quantities ("dedh kilo", "aadha kilo")', () => {
    const r = parseStandardSaleHeuristic('dedh kilo chini aur aadha kilo daal');
    assert.deepEqual(names(r), [['chini', 1.5], ['daal', 0.5]]);
  });

  it('does not treat a lentil "daal" as the verb in "2 kilo daal"', () => {
    const r = parseStandardSaleHeuristic('ali ke khate mein 1 kilo daal daal do');
    assert.deepEqual(names(r), [['daal', 1]]);
  });
});

describe('extractUdhaarCustomer', () => {
  it('never takes a number word or verb as the customer name', () => {
    assert.equal(extractUdhaarCustomer('udhaar do kilo chawal').customerName, null);
    assert.equal(extractUdhaarCustomer('2 chawal udhaar pe de diya').customerName, null);
  });

  it('keeps an honorific with the name', () => {
    assert.equal(extractUdhaarCustomer('soban bhai ke khate mein 2 chawal').customerName, 'soban bhai');
  });
});
