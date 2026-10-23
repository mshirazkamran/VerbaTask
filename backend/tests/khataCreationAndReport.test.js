import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseKhataCreateHeuristic,
  parseKhataReportHeuristic,
  parseKhataSaleHeuristic,
  parseKhataSettleHeuristic,
  parseKhataInquiryHeuristic,
  parseStandardSaleHeuristic,
  parseIntent,
  normalizePkMobile,
} from '../src/services/qwen.service.js';
import { buildKhataStatement } from '../src/services/khata.service.js';
import {
  handleKhataCreate,
  handleKhataSettle,
  handleKhataReport,
  createOrderViaCrm,
  __setTestSender,
} from '../src/controllers/whatsapp.controller.js';
import Customer from '../src/models/Customer.js';
import KhataPayment from '../src/models/KhataPayment.js';
import Order from '../src/models/Order.js';
import InventoryItem from '../src/models/InventoryItem.js';

describe('Khata creation, udhaar sales, settlement and reports', () => {
  describe('normalizePkMobile', () => {
    test('accepts the common ways a Pakistani mobile number is written', () => {
      assert.equal(normalizePkMobile('03001234567'), '03001234567');
      assert.equal(normalizePkMobile('0300 1234567'), '03001234567');
      assert.equal(normalizePkMobile('0300-1234567'), '03001234567');
      assert.equal(normalizePkMobile('+92 300 1234567'), '03001234567');
      assert.equal(normalizePkMobile('923001234567'), '03001234567');
      assert.equal(normalizePkMobile('۰۳۰۰۱۲۳۴۵۶۷'), '03001234567');
    });

    test('rejects numbers that are not Pakistani mobiles', () => {
      assert.equal(normalizePkMobile('0300123'), null);
      assert.equal(normalizePkMobile('04211234567'), null);
      assert.equal(normalizePkMobile('hello'), null);
      assert.equal(normalizePkMobile(''), null);
    });
  });

  describe('parseKhataCreateHeuristic', () => {
    test('parses the exact phrase from the merchant', () => {
      const r = parseKhataCreateHeuristic('Soban bhai ka udhaar ka khaa bnao jin ka phone number ha 03001234567');
      assert.equal(r.type, 'create_khata');
      assert.equal(r.customerName, 'soban bhai');
      assert.equal(r.phone, '03001234567');
    });

    test('parses other spellings, orders and scripts', () => {
      assert.deepEqual(
        (({ customerName, phone }) => ({ customerName, phone }))(parseKhataCreateHeuristic('khata banao ali 0321-1234567')),
        { customerName: 'ali', phone: '03211234567' }
      );
      assert.equal(parseKhataCreateHeuristic('create khata for usman +92 300 1234567').phone, '03001234567');
      assert.equal(parseKhataCreateHeuristic('Soban bhai ka khata bana do.').customerName, 'soban bhai');
      assert.equal(parseKhataCreateHeuristic('سوبان بھائی کا کھاتہ بنا دو 03001234567').phone, '03001234567');
    });

    test('handles the ways voice transcription writes the same request', async () => {
      const variants = [
        'talal ka khata bana do, uska number ha 03001234567',
        'Talal ka khatha bana do, uska number hai 03001234567.',
        'Talal ka khatta bana do, uska number hai 0300 123 4567.',
        'Talal ka account bana do, uska number hai 0300-1234567.',
        'Talal ka naya khata bana do, uska number hai 03001234567',
        'Talal ka khata banado, uska number 03001234567 hai.',
        'Mera ek naya customer hai Talal, uska khata bana do, number 03001234567',
        'طلال کا کھاتہ بنا دو، اس کا نمبر ہے 03001234567',
      ];
      for (const t of variants) {
        const r = await parseIntent(t);
        assert.equal(r.type, 'create_khata', `${t} must create a khata, not log a sale`);
        assert.equal(r.phone, '03001234567', t);
        assert.ok(['talal', 'طلال'].includes(r.customerName), `${t} -> ${r.customerName}`);
      }
    });

    test('a message with a phone number is never parsed as a sale', () => {
      assert.equal(parseStandardSaleHeuristic('talal ka number 03001234567'), null);
      assert.equal(parseStandardSaleHeuristic('Talal ka khatha bana do, uska number hai 03001234567.'), null);
    });

    test('returns no phone when none is given and flags an invalid one', () => {
      assert.equal(parseKhataCreateHeuristic('soban bhai ka khata bnao').phone, null);
      const bad = parseKhataCreateHeuristic('soban bhai ka khata bnao phone 0300123');
      assert.equal(bad.phone, null);
      assert.equal(bad.invalidPhone, true);
    });

    test('ignores messages that are not asking to create a khata', () => {
      for (const t of ['ali ka khata', 'khata ali', 'ali ne 500 diye', 'soban bhai ke khate me lipton daal do', '2 chawal udhaar ali']) {
        assert.equal(parseKhataCreateHeuristic(t), null, t);
      }
    });
  });

  describe('parseKhataSaleHeuristic (adding goods to a khata)', () => {
    test('"<name> ke khate me <item> daal do"', () => {
      const r = parseKhataSaleHeuristic('soban bhai ke khate me lipton yellow label daal do');
      assert.equal(r.type, 'log_sale');
      assert.equal(r.paymentMethod, 'udhaar');
      assert.equal(r.customerName, 'soban bhai');
      assert.deepEqual(r.items, [{ name: 'lipton yellow label', quantity: 1 }]);
    });

    test('"<name> ko <item> udhaar pe de diya." with trailing full stop', () => {
      const r = parseKhataSaleHeuristic('Soban bhai ko lipton yellow label udhaar pe de diya.');
      assert.equal(r.paymentMethod, 'udhaar');
      assert.equal(r.customerName, 'soban bhai');
      assert.equal(r.items[0].name, 'lipton yellow label');
    });

    test('survives the spelling variations voice transcription produces', async () => {
      const variants = [
        'talal ko lipton yellow label udhaar pe de diya',
        'Talal ko Lipton Yellow Label udhaar pe de diya.',
        'Talal ko Lipton Yellow Label, udhaar pe de diya.',
        'talal ko lipton yellow label udhar pe de diya',
        'talal ko lipton yellow label udhaar par de diya',
        'talal ko lipton yellow label udhaar pe de dia',
        'talal ko lipton yellow label udhaar pe de di',
        'talal ko lipton yellow label udhaar ma de diya',
        'talal ko ek lipton yellow label udhaar pe de diya',
        'talal ko lipton yellow label ادھار پر دے دیا',
      ];
      for (const t of variants) {
        const r = await parseIntent(t);
        assert.equal(r.type, 'log_sale', t);
        assert.equal(r.paymentMethod, 'udhaar', `${t} must not become a cash sale`);
        assert.equal(r.customerName, 'talal', t);
        assert.equal(r.items[0].name, 'lipton yellow label', t);
      }
    });

    test('paying a debt back is not mistaken for a khata sale', async () => {
      assert.equal(parseKhataSaleHeuristic('talal ko 3 rupay udhaar wapis kar diye'), null);
      assert.equal(parseKhataSaleHeuristic('talal ko lipton udhaar wapis kar diya'), null);
    });

    test('keeps explicit quantities and several items', () => {
      const r = parseKhataSaleHeuristic('soban bhai ke khate mein 2 chawal aur 1 doodh daal do');
      assert.deepEqual(r.items.map((i) => [i.name, i.quantity]), [['chawal', 2], ['doodh', 1]]);
    });

    test('is not triggered by plain cash sales or money-only phrases', () => {
      assert.equal(parseKhataSaleHeuristic('2 chawal cash'), null);
      assert.equal(parseKhataSaleHeuristic('soban bhai ke khate me 500 daal do'), null);
    });
  });

  describe('settling udhaar from WhatsApp text and voice', () => {
    test('"soban bhai ne 3 rupay udhaar me se de diye" is a settlement, not a sale', () => {
      const r = parseKhataSettleHeuristic('soban bhai ne 3 rupay udhaar me se de diye');
      assert.equal(r.type, 'settle_khata');
      assert.equal(r.customerName, 'soban bhai');
      assert.equal(r.amount, 3);
      assert.equal(parseStandardSaleHeuristic('soban bhai ne 3 rupay udhaar me se de diye'), null);
    });

    test('voice transcripts with a trailing full stop still match', () => {
      const r = parseKhataSettleHeuristic('Soban bhai ne 3 rupay udhaar me se de diye.');
      assert.equal(r.type, 'settle_khata');
      assert.equal(r.amount, 3);
      assert.equal(parseKhataSettleHeuristic('Ali ne 500 diye.').amount, 500);
    });

    test('other ways of saying it', () => {
      assert.equal(parseKhataSettleHeuristic('soban bhai ne udhaar me se 500 diye').amount, 500);
      assert.equal(parseKhataSettleHeuristic('soban bhai ne apne khate me se 200 rupay wapis kar diye').amount, 200);
      assert.equal(parseKhataSettleHeuristic('soban bhai ne 100 jama karwaye udhaar me').amount, 100);
      const urdu = parseKhataSettleHeuristic('سوبان بھائی نے ادھار میں سے 500 دیے');
      assert.equal(urdu.type, 'settle_khata');
      assert.equal(urdu.amount, 500);
    });

    test('parseIntent routes it without ever calling the LLM', async () => {
      const r = await parseIntent('soban bhai ne 3 rupay udhaar me se de diye');
      assert.equal(r.type, 'settle_khata');
      assert.equal(r.customerName, 'soban bhai');
    });
  });

  describe('parseKhataReportHeuristic', () => {
    test('parses the exact phrase from the merchant', () => {
      const r = parseKhataReportHeuristic('soban bhai ke udhaar ya khata ki report bhej do');
      assert.equal(r.type, 'khata_report');
      assert.equal(r.customerName, 'soban bhai');
    });

    test('other phrasings', () => {
      assert.equal(parseKhataReportHeuristic('ali ka khata report').customerName, 'ali');
      assert.equal(parseKhataReportHeuristic('send ledger report of usman').customerName, 'usman');
      assert.equal(parseKhataReportHeuristic('khata statement for rashid bhai').customerName, 'rashid bhai');
      assert.equal(parseKhataReportHeuristic('سوبان بھائی کے کھاتے کی رپورٹ بھیجو').customerName, 'سوبان بھائی');
    });

    test('a plain balance question stays an inquiry, and a normal report is untouched', () => {
      assert.equal(parseKhataReportHeuristic('ali ka khata'), null);
      assert.equal(parseKhataReportHeuristic('sales report'), null);
      assert.equal(parseKhataInquiryHeuristic('ali ka khata').type, 'check_khata');
    });

    test('parseIntent picks the khata report over the inventory report fallback', async () => {
      const r = await parseIntent('soban bhai ke udhaar ya khata ki report bhej do');
      assert.equal(r.type, 'khata_report');
      assert.equal(r.customerName, 'soban bhai');
    });
  });

  describe('buildKhataStatement', () => {
    const customer = { _id: 'c1', name: 'soban bhai', balance: 1250, createdAt: '2026-10-01T10:00:00Z' };
    const orders = [
      { createdAt: '2026-10-05T09:30:00Z', total: 450, orderNumber: 'VT-1', status: 'completed', items: [{ name: 'Lipton', quantity: 1 }, { name: 'Sugar', quantity: 2 }] },
      { createdAt: '2026-10-12T15:10:00Z', total: 900, orderNumber: 'VT-2', status: 'completed', items: [{ name: 'Rice', quantity: 3 }] },
    ];
    const payments = [{ createdAt: '2026-10-08T12:00:00Z', amount: 100 }];

    test('lists purchases and payments by date with a running balance', () => {
      const { rows, totals } = buildKhataStatement({ customer, orders, payments });
      assert.deepEqual(rows.map((r) => r.type), ['purchase', 'payment', 'purchase']);
      assert.deepEqual(rows.map((r) => r.balance), [450, 350, 1250]);
      assert.match(rows[0].details, /1x Lipton, 2x Sugar/);
      assert.deepEqual(totals, { purchased: 1350, paid: 100, balance: 1250, purchaseCount: 2 });
    });

    test('shows balance that predates the records as an explicit earlier-balance row', () => {
      const { rows, totals } = buildKhataStatement({ customer: { ...customer, balance: 1750 }, orders, payments });
      assert.equal(rows[0].type, 'opening');
      assert.equal(rows[0].debit, 500);
      assert.equal(rows.at(-1).balance, 1750, 'statement must end on the real outstanding balance');
      assert.equal(totals.purchased, 1850);
    });

    test('an empty khata produces an empty statement', () => {
      const { rows, totals } = buildKhataStatement({ customer: { ...customer, balance: 0 }, orders: [], payments: [] });
      assert.equal(rows.length, 0);
      assert.equal(totals.balance, 0);
    });
  });

  describe('WhatsApp handlers', () => {
    const merchant = { _id: 'merchant_1', whatsappNumber: '923000000000', language: 'en', voiceReplies: false };
    let sent;
    let origFind;
    let origFindOne;
    let origCreate;
    let origPaymentCreate;

    // Customer.find is used both as `await find(q)` and `find(q).limit(n)`
    const listOf = (items) => {
      const arr = [...items];
      arr.limit = async () => arr;
      return arr;
    };

    beforeEach(() => {
      sent = [];
      __setTestSender(null, async (to, text) => { sent.push(text); return { messages: [{ id: 'wamid.1' }] }; });
      origFind = Customer.find;
      origFindOne = Customer.findOne;
      origCreate = Customer.create;
      origPaymentCreate = KhataPayment.create;
    });

    afterEach(() => {
      Customer.find = origFind;
      Customer.findOne = origFindOne;
      Customer.create = origCreate;
      KhataPayment.create = origPaymentCreate;
      __setTestSender(null, null);
    });

    describe('handleKhataCreate', () => {
      test('creates the khata with the phone number', async () => {
        let created = null;
        Customer.find = () => listOf([]);
        Customer.findOne = async () => null;
        Customer.create = async (data) => { created = data; return { _id: 'c1', ...data }; };

        await handleKhataCreate(merchant, 'Soban Bhai', '0300 1234567');

        assert.deepEqual(created, { merchantId: 'merchant_1', name: 'soban bhai', phone: '03001234567', balance: 0 });
        assert.match(sent[0], /Khata created/);
        assert.match(sent[0], /03001234567/);
      });

      test('does NOT create a khata without a phone number', async () => {
        let created = false;
        Customer.create = async () => { created = true; return {}; };

        await handleKhataCreate(merchant, 'soban bhai', null);

        assert.equal(created, false);
        assert.match(sent[0], /phone number is required/i);
        assert.match(sent[0], /03001234567/);
      });

      test('does NOT create a khata for an invalid phone number', async () => {
        let created = false;
        Customer.create = async () => { created = true; return {}; };

        await handleKhataCreate(merchant, 'soban bhai', '0300123');

        assert.equal(created, false);
        assert.match(sent[0], /isn't valid/);
      });

      test('does not create a duplicate for the same customer, even with an honorific', async () => {
        let created = false;
        const existing = { _id: 'c1', name: 'soban', phone: '03001234567', balance: 250 };
        Customer.findOne = async ({ name }) => (name instanceof RegExp && name.test('soban') ? existing : null);
        Customer.find = () => listOf([existing]);
        Customer.create = async () => { created = true; return {}; };

        await handleKhataCreate(merchant, 'soban bhai', '03211234567');

        assert.equal(created, false);
        assert.match(sent[0], /already has a khata/);
        assert.match(sent[0], /250/);
      });

      test('does not reuse a phone number that already belongs to another khata', async () => {
        let created = false;
        Customer.find = () => listOf([]);
        Customer.findOne = async (q) => (q.phone ? { _id: 'c9', name: 'rashid', phone: q.phone } : null);
        Customer.create = async () => { created = true; return {}; };

        await handleKhataCreate(merchant, 'soban bhai', '03001234567');

        assert.equal(created, false);
        assert.match(sent[0], /already belongs to/i);
      });

      test('"ali" is not mistaken for the existing customer "salim"', async () => {
        let created = null;
        const salim = { _id: 'c2', name: 'salim', balance: 0 };
        Customer.findOne = async () => null;
        Customer.find = () => listOf([salim]);
        Customer.create = async (data) => { created = data; return { _id: 'c3', ...data }; };

        await handleKhataCreate(merchant, 'ali', '03001234567');

        assert.equal(created?.name, 'ali');
      });
    });

    describe('udhaar sales', () => {
      let origInvFindOne;
      let origOrderCreate;
      let stockSaved;
      let orderCreated;

      beforeEach(() => {
        stockSaved = false;
        orderCreated = false;
        origInvFindOne = InventoryItem.findOne;
        origOrderCreate = Order.create;
        InventoryItem.findOne = async () => ({
          _id: 'inv_1', name: 'Lipton Yellow Label', price: 450, quantity: 10, save: async () => { stockSaved = true; },
        });
        Order.create = async (data) => { orderCreated = true; return { ...data, _id: 'o1', save: async () => {} }; };
      });

      afterEach(() => {
        InventoryItem.findOne = origInvFindOne;
        Order.create = origOrderCreate;
      });

      test('a sale to a customer with no khata is refused and explains how to create one', async () => {
        let created = false;
        Customer.findOne = async () => null;
        Customer.find = () => listOf([]);
        Customer.create = async () => { created = true; return {}; };

        await createOrderViaCrm(merchant, {
          merchantId: 'merchant_1',
          items: [{ name: 'lipton yellow label', quantity: 1 }],
          paymentMethod: 'udhaar',
          customerName: 'soban bhai',
          source: 'text',
          language: 'en',
        });

        assert.equal(created, false, 'a sale must not create the khata');
        assert.equal(stockSaved, false, 'stock must stay untouched');
        assert.equal(orderCreated, false);
        assert.match(sent[0], /no khata for \*soban bhai\*/i);
        assert.match(sent[0], /ka khata bnao phone/);
      });

      test('an udhaar sale with no name asks whose khata it is', async () => {
        await createOrderViaCrm(merchant, {
          merchantId: 'merchant_1',
          items: [{ name: 'lipton yellow label', quantity: 1 }],
          paymentMethod: 'udhaar',
          source: 'text',
          language: 'en',
        });

        assert.equal(orderCreated, false);
        assert.match(sent[0], /Whose khata/);
      });

      test('a sale to an existing khata goes through and raises the balance', async () => {
        let savedCustomer = null;
        const khata = { _id: 'c1', name: 'soban bhai', balance: 0, save: async function () { savedCustomer = this; } };
        Customer.findOne = async ({ name }) => (name === 'soban bhai' ? khata : null);
        Customer.find = () => listOf([khata]);

        await createOrderViaCrm(merchant, {
          merchantId: 'merchant_1',
          items: [{ name: 'lipton yellow label', quantity: 1 }],
          paymentMethod: 'udhaar',
          customerName: 'Soban Bhai',
          source: 'text',
          language: 'en',
        });

        assert.equal(orderCreated, true);
        assert.equal(stockSaved, true);
        assert.equal(savedCustomer.balance, 450);
        assert.match(sent[0], /✅/);
      });
    });

    describe('handleKhataSettle', () => {
      test('records the payment, reduces the balance, and keeps it as history', async () => {
        let payment = null;
        const khata = { _id: 'c1', name: 'soban bhai', balance: 450, save: async function () {} };
        Customer.findOne = async () => khata;
        Customer.find = () => listOf([khata]);
        KhataPayment.create = async (data) => { payment = data; return data; };

        await handleKhataSettle(merchant, 'soban bhai', 3, 'voice');

        assert.equal(khata.balance, 447);
        assert.equal(payment.amount, 3);
        assert.equal(payment.balanceAfter, 447);
        assert.equal(payment.source, 'voice');
        assert.match(sent[0], /Ledger payment recorded/);
      });

      test('says so, and records nothing, when the customer owes nothing', async () => {
        let payment = false;
        const khata = { _id: 'c1', name: 'soban bhai', balance: 0, save: async function () {} };
        Customer.findOne = async () => khata;
        Customer.find = () => listOf([khata]);
        KhataPayment.create = async () => { payment = true; return {}; };

        await handleKhataSettle(merchant, 'soban bhai', 500, 'text');

        assert.equal(payment, false);
        assert.match(sent[0], /no outstanding balance/);
      });

      test('only the part up to the balance is recorded when the customer overpays', async () => {
        let payment = null;
        const khata = { _id: 'c1', name: 'soban bhai', balance: 200, save: async function () {} };
        Customer.findOne = async () => khata;
        Customer.find = () => listOf([khata]);
        KhataPayment.create = async (data) => { payment = data; return data; };

        await handleKhataSettle(merchant, 'soban bhai', 500, 'text');

        assert.equal(khata.balance, 0);
        assert.equal(payment.amount, 200);
        assert.match(sent[0], /300 was more than the balance owed/);
      });
    });

    describe('handleKhataReport', () => {
      test('explains how to create the khata when the customer has none', async () => {
        Customer.findOne = async () => null;
        Customer.find = () => listOf([]);

        await handleKhataReport(merchant, 'soban bhai', 'text');

        assert.match(sent[0], /no khata for \*soban bhai\*/i);
      });
    });
  });
});
