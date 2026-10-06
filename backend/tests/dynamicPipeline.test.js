import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import InventoryItem from '../src/models/InventoryItem.js';
import Merchant from '../src/models/Merchant.js';
import {
  getMerchantCatalog,
  invalidateMerchantCatalog,
  recordMerchantAlias,
} from '../src/services/catalogCache.service.js';
import { buildVocabularyPrompt } from '../src/agent/transcribeAndParse.js';
import { parseStockHeuristic } from '../src/services/qwen.service.js';
import { findSimilarInventoryItems } from '../src/crm/item-matching.js';

describe('Dynamic AI Pipeline & Domain Agnostic Tests', () => {
  describe('In-Memory Catalog Cache (catalogCache.service)', () => {
    test('loads merchant catalog and caches subsequent lookups', async () => {
      const merchantId = 'merchant_pharma_123';
      let dbCalls = 0;

      const origFind = InventoryItem.find;
      const origFindById = Merchant.findById;

      InventoryItem.find = (filter) => {
        dbCalls++;
        return {
          select: () => ({
            lean: async () => [
              { name: 'Panadol 500mg', aliases: ['panadol', 'paracetamol'], price: 50, unit: 'strip', quantity: 100 },
              { name: 'Brufen Syrup', aliases: ['brufen'], price: 120, unit: 'bottle', quantity: 45 },
            ],
          }),
        };
      };

      Merchant.findById = (id) => ({
        select: () => ({
          lean: async () => ({ businessName: 'Al-Shifa Medical Store', businessType: 'pharmacy' }),
        }),
      });

      try {
        invalidateMerchantCatalog(merchantId);

        // First call - queries DB
        const catalog1 = await getMerchantCatalog(merchantId);
        assert.equal(catalog1.businessName, 'Al-Shifa Medical Store');
        assert.equal(catalog1.businessType, 'pharmacy');
        assert.equal(catalog1.names.length, 2);
        assert.equal(catalog1.aliasMap.get('panadol'), 'Panadol 500mg');
        assert.equal(catalog1.aliasMap.get('brufen'), 'Brufen Syrup');
        assert.equal(dbCalls, 1);

        // Second call - served from cache
        const catalog2 = await getMerchantCatalog(merchantId);
        assert.equal(catalog2.names.length, 2);
        assert.equal(dbCalls, 1, 'Should serve from in-memory cache without hitting database');

        // Invalidate and verify DB hit again
        invalidateMerchantCatalog(merchantId);
        const catalog3 = await getMerchantCatalog(merchantId);
        assert.equal(catalog3.names.length, 2);
        assert.equal(dbCalls, 2, 'Should re-query database after explicit invalidation');
      } finally {
        InventoryItem.find = origFind;
        Merchant.findById = origFindById;
        invalidateMerchantCatalog(merchantId);
      }
    });

    test('recordMerchantAlias updates MongoDB and purges cache', async () => {
      const merchantId = 'merchant_auto_456';
      let updatedFilter = null;
      let updatedPayload = null;

      const origUpdateOne = InventoryItem.updateOne;
      const origFind = InventoryItem.find;
      const origFindById = Merchant.findById;

      InventoryItem.updateOne = async (filter, payload) => {
        updatedFilter = filter;
        updatedPayload = payload;
        return { modifiedCount: 1 };
      };

      InventoryItem.find = () => ({
        select: () => ({
          lean: async () => [{ name: 'Brake Pad Corolla', aliases: ['brake lether'], price: 2500 }],
        }),
      });
      Merchant.findById = () => ({
        select: () => ({
          lean: async () => ({ businessName: 'Speedy Auto Parts', businessType: 'auto_parts' }),
        }),
      });

      try {
        await recordMerchantAlias(merchantId, 'Brake Pad Corolla', 'lether pad');
        assert.deepEqual(updatedFilter, { merchantId, name: 'Brake Pad Corolla' });
        assert.deepEqual(updatedPayload, { $addToSet: { aliases: 'lether pad' } });
      } finally {
        InventoryItem.updateOne = origUpdateOne;
        InventoryItem.find = origFind;
        Merchant.findById = origFindById;
        invalidateMerchantCatalog(merchantId);
      }
    });
  });

  describe('Dynamic Context-Aware Whisper Vocabulary Builder', () => {
    test('generates dynamic prompt with pharmacy merchant catalog', () => {
      const merchant = { businessName: 'HealthPlus Pharmacy', businessType: 'pharmacy' };
      const catalog = {
        names: ['Panadol 500mg', 'Brufen Syrup', 'Disprin', 'Augmentin 625mg', 'Flagyl 400mg'],
      };

      const prompt = buildVocabularyPrompt(merchant, catalog);
      assert.ok(prompt.includes('HealthPlus Pharmacy'));
      assert.ok(prompt.includes('pharmacy'));
      assert.ok(prompt.includes('Panadol 500mg, Brufen Syrup, Disprin'));
      assert.ok(!prompt.includes('daal channa'));
    });

    test('generates dynamic prompt for auto parts store', () => {
      const merchant = { businessName: 'Khan Auto Workshop', businessType: 'auto_parts' };
      const catalog = {
        names: ['Spark Plug NGK', 'Brake Pad', 'Mobil 1 Oil 4L', 'Oil Filter', 'Timing Belt'],
      };

      const prompt = buildVocabularyPrompt(merchant, catalog);
      assert.ok(prompt.includes('Khan Auto Workshop'));
      assert.ok(prompt.includes('auto_parts'));
      assert.ok(prompt.includes('Spark Plug NGK, Brake Pad'));
      assert.ok(!prompt.includes('ghee'));
    });

    test('falls back gracefully when catalog is empty', () => {
      const prompt = buildVocabularyPrompt({}, { names: [] });
      assert.ok(prompt.includes('Pakistani retail commerce'));
      assert.ok(prompt.includes('payment terms'));
    });
  });

  describe('Multi-Domain Retail Heuristic Parsing', () => {
    test('parses pharmacy restock with units', () => {
      const parsed = parseStockHeuristic('maal aya 20 strip panadol');
      assert.ok(parsed);
      assert.equal(parsed.type, 'update_stock');
      assert.equal(parsed.item.name, 'panadol');
      assert.equal(parsed.item.quantity, 20);
      assert.equal(parsed.item.unit, 'strip');
    });

    test('parses auto parts restock with price', () => {
      const parsed = parseStockHeuristic('add 4 spark plug price 450');
      assert.ok(parsed);
      assert.equal(parsed.type, 'update_stock');
      assert.equal(parsed.item.name, 'spark plug');
      assert.equal(parsed.item.quantity, 4);
      assert.equal(parsed.item.price, 450);
    });

    test('parses boutique / clothing restock with suit unit', () => {
      const parsed = parseStockHeuristic('maal aya 10 suit lawn');
      assert.ok(parsed);
      assert.equal(parsed.type, 'update_stock');
      assert.equal(parsed.item.name, 'lawn');
      assert.equal(parsed.item.quantity, 10);
      assert.equal(parsed.item.unit, 'suit');
    });

    test('parses hardware store wire restock with meter unit', () => {
      const parsed = parseStockHeuristic('maal aya 100 meter wire');
      assert.ok(parsed);
      assert.equal(parsed.type, 'update_stock');
      assert.equal(parsed.item.name, 'wire');
      assert.equal(parsed.item.quantity, 100);
      assert.equal(parsed.item.unit, 'meter');
    });

    test('parses pharmacy stock check', () => {
      const parsed = parseStockHeuristic('brufen kitni hai');
      assert.ok(parsed);
      assert.equal(parsed.type, 'check_stock');
      assert.equal(parsed.item.name, 'brufen');
    });
  });

  describe('Self-Learning Aliases in Item Matching', () => {
    test('matches spoken nickname with 1.0 exact score via learned aliases', async () => {
      const origFind = InventoryItem.find;

      InventoryItem.find = () => ({
        limit: async () => [
          {
            _id: 'item_pharma_1',
            name: 'Acetaminophen 500mg',
            aliases: ['panadol', 'paracetamol', 'pain killer'],
            quantity: 50,
            price: 40,
          },
          {
            _id: 'item_pharma_2',
            name: 'Ibuprofen 400mg',
            aliases: ['brufen'],
            quantity: 30,
            price: 60,
          },
        ],
      });

      try {
        const matches = await findSimilarInventoryItems('merchant_123', 'panadol', { limit: 1 });
        assert.equal(matches.length, 1);
        assert.equal(matches[0].item.name, 'Acetaminophen 500mg');
        assert.equal(matches[0].score, 1.0);
      } finally {
        InventoryItem.find = origFind;
      }
    });
  });
});
