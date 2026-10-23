import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { parseIntent, parseStandardSaleHeuristic } from '../src/services/qwen.service.js';
import { restockItemViaCrm } from '../src/crm/inventory.service.js';
import { isSameItemName } from '../src/crm/item-matching.js';
import { createOrder } from '../src/crm/order.service.js';
import { respond } from '../src/approvals/approval.service.js';
import InventoryItem from '../src/models/InventoryItem.js';
import Customer from '../src/models/Customer.js';
import Order from '../src/models/Order.js';
import Merchant from '../src/models/Merchant.js';
import Approval from '../src/models/Approval.js';
import Workflow from '../src/models/Workflow.js';

const LLM_KEYS = ['GROQ_API_KEY', 'GEMINI_API_KEY', 'DASHSCOPE_API_KEY'];
const saved = {};
const originals = {};

function mock(model, method, impl) {
  originals[`${model.modelName}.${method}`] ??= [model, method, model[method]];
  model[method] = impl;
}

before(() => {
  for (const k of LLM_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
  mock(Workflow, 'find', async () => []); // no threshold automations
});
after(() => {
  for (const k of LLM_KEYS) { if (saved[k] !== undefined) process.env[k] = saved[k]; }
  for (const [model, method, fn] of Object.values(originals)) model[method] = fn;
});

describe('Multi-item restock messages', () => {
  const cases = [
    'stock main 100 kg haldi add kro, 500 kg chawal add kro 230 rupee per kg, 500 kg kainat chawal add kro 250 rupee per kg, 500 kg steam chawal add kro 300 rupee per kg',
    'stock main 100 kg haldi add kro, 500 kg chawal price 230 rupee per kg, 500 kg kainat chawal price 250 rupee per kg, 500 kg steam chawal price 300 rupee per kg',
  ];
  for (const text of cases) {
    it(`parses every item: "${text.slice(0, 60)}..."`, async () => {
      const r = await parseIntent(text);
      assert.equal(r.type, 'update_stock');
      assert.deepEqual(
        r.items.map((i) => [i.name, i.quantity, i.unit, i.price]),
        [['haldi', 100, 'kg', null], ['chawal', 500, 'kg', 230], ['kainat chawal', 500, 'kg', 250], ['steam chawal', 500, 'kg', 300]]
      );
    });
  }

  it('reads "inventory main add kro ..." with the command in front', async () => {
    const r = await parseIntent('inventory main add kro 500 kg steam chawal price 230');
    assert.deepEqual(r.items.map((i) => [i.name, i.quantity, i.price]), [['steam chawal', 500, 230]]);
  });

  it('keeps the quantity when it equals the price ("230 kg chawal price 230")', async () => {
    const r = await parseIntent('add 230 kg chawal price 230');
    assert.equal(r.items[0].quantity, 230);
    assert.equal(r.items[0].price, 230);
  });
});

describe('Restock matches only the same product', () => {
  it('"steam chawal" and "kainat chawal" are not "Rice"; "chawal" is', () => {
    assert.equal(isSameItemName('steam chawal', 'Rice'), false);
    assert.equal(isSameItemName('kainat chawal', 'Rice'), false);
    assert.equal(isSameItemName('chawal', 'Rice'), true);
  });

  it('adds each line once, creates new variants, and asks for missing prices instead of crashing', async () => {
    const stock = [
      { _id: 'i_rice', name: 'Rice', quantity: 1000, price: 220, unit: 'kg', aliases: [] },
      { _id: 'i_haldi', name: 'Haldi', quantity: 10, price: 900, unit: 'kg', aliases: [] },
    ];
    const withSave = (doc) => ({ ...doc, save: async function () { Object.assign(doc, { quantity: this.quantity, price: this.price, unit: this.unit }); } });
    const created = [];
    mock(InventoryItem, 'findOne', async (q) => {
      const re = q.name;
      const hit = stock.find((s) => re instanceof RegExp && re.test(s.name));
      return hit ? withSave(hit) : null;
    });
    mock(InventoryItem, 'find', () => ({ limit: async () => stock.map(withSave) }));
    mock(InventoryItem, 'create', async (doc) => { created.push(doc); return { _id: `new_${created.length}`, ...doc }; });

    const r = await restockItemViaCrm({ _id: 'm1', language: 'en' }, {
      items: [
        { name: 'haldi', quantity: 100, unit: 'kg' },
        { name: 'chawal', quantity: 500, unit: 'kg', price: 230 },
        { name: 'kainat chawal', quantity: 500, unit: 'kg', price: 250 },
        { name: 'steam chawal', quantity: 500, unit: 'kg', price: 300 },
        { name: 'kala namak', quantity: 5, unit: 'kg' },
      ],
    });

    assert.equal(stock.find((s) => s.name === 'Rice').quantity, 1500, 'Rice gets only its own 500 kg');
    assert.equal(stock.find((s) => s.name === 'Haldi').quantity, 110);
    assert.deepEqual(created.map((c) => [c.name, c.quantity, c.price]), [['Kainat Chawal', 500, 250], ['Steam Chawal', 500, 300]]);
    assert.equal(r.requiresDetails, true, 'new item without a price is asked about');
    assert.equal(r.item.name, 'Kala Namak');
    assert.ok(r.text.includes('Stock added'));
  });
});

describe('Udhaar customer name', () => {
  const text = '2 namak, 4 lipton yellow label, 10 haldi talal pwd waaly ko udhaar pr';

  it('never takes the word after "udhaar" ("pr") as the name', () => {
    const r = parseStandardSaleHeuristic(text);
    assert.notEqual(r.customerName, 'pr');
    assert.deepEqual(r.items.map((i) => [i.name, i.quantity]), [['namak', 2], ['lipton yellow label', 4], ['haldi', 10]]);
  });

  it('uses the merchant\'s khata names to find where the name starts, and keeps it as said', () => {
    // The khata itself is picked (or confirmed with the merchant) later, by rankKhataCustomers.
    const r = parseStandardSaleHeuristic(text, { knownCustomers: ['talal', 'ali'] });
    assert.equal(r.customerName, 'talal pwd waaly');
    assert.equal(r.paymentMethod, 'udhaar');
    assert.deepEqual(r.items.map((i) => i.name), ['namak', 'lipton yellow label', 'haldi']);
  });
});

describe('High-value approval: no sale until approved', () => {
  const merchantId = '507f1f77bcf86cd799439011';
  let rice;
  let customer;
  let orderDoc;
  let approvalDoc;

  before(() => {
    rice = { _id: 'i_rice', name: 'Rice', quantity: 100, price: 300 };
    customer = { _id: 'c_talal', name: 'talal', balance: 0 };
    mock(Merchant, 'findById', () => ({ lean: async () => ({ requireApprovalForHighValue: true, highValueThreshold: 10000 }) }));
    mock(InventoryItem, 'findOne', async () => ({ ...rice, save: async function () { rice.quantity = this.quantity; } }));
    mock(Customer, 'findOne', async ({ name }) => (name === 'talal' ? { ...customer, save: async function () { customer.balance = this.balance; } } : null));
    mock(Customer, 'findOneAndUpdate', async (_q, u) => { customer.balance += u.$inc.balance; return customer; });
    mock(InventoryItem, 'findOneAndUpdate', async (q, u) => {
      if (rice.quantity < q.quantity.$gte) return null;
      rice.quantity += u.$inc.quantity;
      return rice;
    });
    mock(InventoryItem, 'bulkWrite', async (ops) => { for (const op of ops) rice.quantity += op.updateOne.update.$inc.quantity; });
    mock(InventoryItem, 'find', async () => [rice]);
    mock(InventoryItem, 'findById', () => ({ lean: async () => rice }));
    mock(Order, 'create', async (data) => { orderDoc = { ...data, _id: 'o1', save: async () => {} }; return orderDoc; });
    mock(Order, 'findById', async () => orderDoc);
    mock(Approval, 'create', async (data) => { approvalDoc = { ...data, _id: 'a1', status: 'pending' }; return approvalDoc; });
    mock(Approval, 'findOneAndUpdate', async (_q, u) => ({ ...approvalDoc, ...u, merchantId }));
    mock(Approval, 'updateOne', async () => ({}));
  });

  it('does not deduct stock or charge the khata while pending', async () => {
    const order = await createOrder({ merchantId, source: 'voice', paymentMethod: 'udhaar', customerName: 'talal', items: [{ name: 'Rice', quantity: 50 }] });
    assert.equal(order.status, 'pending_approval');
    assert.equal(order.stockApplied, false);
    assert.equal(rice.quantity, 100);
    assert.equal(customer.balance, 0);
  });

  it('applies stock and khata on approval', async () => {
    await respond('a1', 'approved', merchantId);
    assert.equal(rice.quantity, 50);
    assert.equal(customer.balance, 15000);
    assert.equal(orderDoc.status, 'approved');
    assert.equal(orderDoc.stockApplied, true);
  });

  it('a rejected pending order changes nothing', async () => {
    rice.quantity = 100;
    customer.balance = 0;
    await createOrder({ merchantId, source: 'voice', paymentMethod: 'udhaar', customerName: 'talal', items: [{ name: 'Rice', quantity: 50 }] });
    await respond('a1', 'rejected', merchantId);
    assert.equal(rice.quantity, 100);
    assert.equal(customer.balance, 0);
    assert.equal(orderDoc.status, 'rejected');
  });

  it('rejecting an older order that was applied at creation restores stock AND the khata', async () => {
    rice.quantity = 50;
    customer.balance = 15000;
    orderDoc = { _id: 'o_old', merchantId, items: [{ inventoryItemId: 'i_rice', name: 'Rice', quantity: 50 }], total: 15000, paymentMethod: 'udhaar', customerId: 'c_talal', save: async () => {} };
    await respond('a1', 'rejected', merchantId);
    assert.equal(rice.quantity, 100);
    assert.equal(customer.balance, 0);
  });

  it('refuses approval when the stock was sold meanwhile, and keeps the approval open', async () => {
    rice.quantity = 10;
    let reopened = false;
    mock(Approval, 'updateOne', async () => { reopened = true; return {}; });
    orderDoc = { _id: 'o2', merchantId, items: [{ inventoryItemId: 'i_rice', name: 'Rice', quantity: 50 }], total: 15000, paymentMethod: 'cash', stockApplied: false, status: 'pending_approval', save: async () => {} };
    await assert.rejects(respond('a1', 'approved', merchantId), /INSUFFICIENT_STOCK/);
    assert.equal(rice.quantity, 10);
    assert.equal(reopened, true);
    assert.equal(orderDoc.status, 'pending_approval');
  });
});
