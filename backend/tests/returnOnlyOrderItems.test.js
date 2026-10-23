import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { processOrderReturn } from '../src/crm/return.service.js';
import Order from '../src/models/Order.js';
import InventoryItem from '../src/models/InventoryItem.js';
import Customer from '../src/models/Customer.js';
import Workflow from '../src/models/Workflow.js';

describe('Returns only accept goods that are on the order', () => {
  const originals = [];
  const mock = (obj, key, fn) => { originals.push([obj, key, obj[key]]); obj[key] = fn; };
  let order;
  let saved;
  let restocked;

  beforeEach(() => {
    saved = false;
    restocked = [];
    order = {
      _id: 'o1', merchantId: 'm1', orderNumber: 'VT-442708-400', paymentMethod: 'cash', status: 'completed',
      items: [{ inventoryItemId: 'inv_oil', name: 'Sufi Oil', quantity: 1, price: 600 }],
      returnHistory: [],
      save: async () => { saved = true; },
    };
    mock(Order, 'findOne', async () => order);
    const stock = [{ _id: 'inv_oil', name: 'Sufi Oil', quantity: 5, aliases: [] }, { _id: 'inv_daal', name: 'Daal', quantity: 5, aliases: [] }];
    const doc = (d) => ({ ...d, save: async function () { restocked.push([d.name, this.quantity]); } });
    mock(InventoryItem, 'findOne', async (q) => {
      if (q._id) return doc(stock.find((s) => s._id === q._id));
      const re = q.$or?.[0]?.name;
      const hit = stock.find((s) => re instanceof RegExp && re.test(s.name));
      return hit ? doc(hit) : null;
    });
    mock(InventoryItem, 'find', () => ({ limit: async () => stock.map(doc) }));
    mock(Customer, 'findOne', async () => null);
    mock(Workflow, 'find', async () => []);
  });
  afterEach(() => { for (const [obj, key, fn] of originals.reverse()) obj[key] = fn; originals.length = 0; });

  it('a payment sentence misread as a return changes nothing (the screenshot bug)', async () => {
    await assert.rejects(
      processOrderReturn('m1', { orderNumber: 'VT-442708-400', items: [{ name: 'ali ne dediay udhaar se', quantity: 1 }] }),
      /NO_VALID_ITEMS/
    );
    assert.equal(saved, false, 'order untouched');
    assert.equal(order.status, 'completed');
    assert.deepEqual(restocked, []);
  });

  it('an item from a different order line is not restocked', async () => {
    await assert.rejects(processOrderReturn('m1', { orderNumber: 'VT-442708-400', items: [{ name: 'Daal', quantity: 1 }] }), /NO_VALID_ITEMS/);
    assert.deepEqual(restocked, []);
  });

  it('cannot return more than was sold', async () => {
    const r = await processOrderReturn('m1', { orderNumber: 'VT-442708-400', items: [{ name: 'Sufi Oil', quantity: 5 }] });
    assert.equal(r.refundAmount, 600);
    assert.deepEqual(restocked, [['Sufi Oil', 6]]);
    assert.equal(order.status, 'returned');
  });
});
