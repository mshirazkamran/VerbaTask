import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseStockHeuristic } from '../src/services/qwen.service.js';

describe('Production Features & Edge Cases Tests', () => {
  describe('Multi-Item Restock Parsing', () => {
    test('parses multi-item restock with aur and prices', () => {
      const parsed = parseStockHeuristic('maal aya 20 chini 150 aur 10 daal 200');
      assert.ok(parsed);
      assert.equal(parsed.type, 'update_stock');
      assert.equal(parsed.items.length, 2);
      assert.equal(parsed.items[0].name, 'chini');
      assert.equal(parsed.items[0].quantity, 20);
      assert.equal(parsed.items[0].price, 150);

      assert.equal(parsed.items[1].name, 'daal');
      assert.equal(parsed.items[1].quantity, 10);
      assert.equal(parsed.items[1].price, 200);
    });

    test('parses multi-item restock separated by comma with missing prices', () => {
      const parsed = parseStockHeuristic('maal aya 20 chini, 10 daal, 5 tel');
      assert.ok(parsed);
      assert.equal(parsed.type, 'update_stock');
      assert.equal(parsed.items.length, 3);
      assert.equal(parsed.items[0].quantity, 20);
      assert.equal(parsed.items[0].price, null);
      assert.equal(parsed.items[1].quantity, 10);
      assert.equal(parsed.items[1].price, null);
      assert.equal(parsed.items[2].quantity, 5);
      assert.equal(parsed.items[2].price, null);
    });

    test('parses multi-item restock in Urdu script', () => {
      const parsed = parseStockHeuristic('مال آیا 20 کلو چینی 150 اور 10 کلو دال 200');
      assert.ok(parsed);
      assert.equal(parsed.type, 'update_stock');
      assert.equal(parsed.items.length, 2);
      assert.equal(parsed.items[0].price, 150);
      assert.equal(parsed.items[1].price, 200);
    });
  });
});
