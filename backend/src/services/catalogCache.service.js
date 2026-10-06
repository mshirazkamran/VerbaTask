import InventoryItem from '../models/InventoryItem.js';
import Merchant from '../models/Merchant.js';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const catalogStore = new Map();

/**
 * Retrieves the merchant's active product catalog and alias index from memory.
 * Caches results to support 1,000+ concurrent requests with sub-millisecond lookups.
 */
export async function getMerchantCatalog(merchantId) {
  if (!merchantId) return { names: [], aliasMap: new Map(), items: [] };

  const idStr = String(merchantId);
  const cached = catalogStore.get(idStr);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const [items, merchant] = await Promise.all([
    InventoryItem.find({ merchantId }).select('name aliases price unit quantity').lean(),
    Merchant.findById(merchantId).select('businessName businessType').lean(),
  ]);

  const names = [];
  const aliasMap = new Map();

  for (const item of items) {
    names.push(item.name);
    const canonicalLower = item.name.toLowerCase().trim();
    aliasMap.set(canonicalLower, item.name);

    if (Array.isArray(item.aliases)) {
      for (const alias of item.aliases) {
        if (alias) aliasMap.set(alias.toLowerCase().trim(), item.name);
      }
    }
  }

  const data = {
    names,
    aliasMap,
    items,
    businessName: merchant?.businessName || '',
    businessType: merchant?.businessType || 'general',
  };

  catalogStore.set(idStr, { data, timestamp: Date.now() });

  if (catalogStore.size > 2000) {
    const oldestKey = catalogStore.keys().next().value;
    catalogStore.delete(oldestKey);
  }

  return data;
}

/**
 * Invalidates the cached catalog for a merchant on inventory mutations.
 */
export function invalidateMerchantCatalog(merchantId) {
  if (!merchantId) return;
  catalogStore.delete(String(merchantId));
}

/**
 * Persists a learned alias to the item document in MongoDB and purges cache.
 */
export async function recordMerchantAlias(merchantId, canonicalName, rawAlias) {
  if (!merchantId || !canonicalName || !rawAlias) return;
  const cleanAlias = rawAlias.toLowerCase().trim();
  if (!cleanAlias || cleanAlias === canonicalName.toLowerCase().trim()) return;

  await InventoryItem.updateOne(
    { merchantId, name: canonicalName },
    { $addToSet: { aliases: cleanAlias } }
  );

  invalidateMerchantCatalog(merchantId);
}
