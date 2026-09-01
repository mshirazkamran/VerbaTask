/**
 * Fuzzy inventory-item matching — bridges the gap between how a merchant
 * SAYS an item ("dal mash", spoken quickly) and how it's spelled in their
 * stock list ("Daal Maash"). Pure string logic, no network: safe to call
 * inline on every order.
 */
import InventoryItem from '../models/InventoryItem.js';

/** Lowercase, strip punctuation (keeping Urdu letters), collapse whitespace. */
export function normalizeName(str) {
  return String(str ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Classic Levenshtein edit distance — fine for short item names. */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * 0..1 similarity between two raw item names. Combines four views so both
 * spelling slips and word-order/containment differences score well:
 * edit distance, token overlap ("maash daal" == "daal maash"), containment
 * ("daal" inside "daal maash" — partial credit only, so it never auto-picks
 * over a full match), and space-stripped comparison ("dalmash" == one spoken
 * word — transcription merges and splits words all the time).
 */
export function similarity(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const lev = 1 - levenshtein(na, nb) / Math.max(na.length, nb.length);

  const ta = na.split(' ');
  const tb = nb.split(' ');
  let matched = 0;
  for (const t of ta) if (tb.includes(t)) matched++;
  const tokenScore = matched / Math.max(ta.length, tb.length);

  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  const contains =
    shorter.length >= 3 && longer.includes(shorter)
      ? 0.6 + 0.3 * (shorter.length / longer.length)
      : 0;

  // Space-stripped edit distance: "dalmash" vs "daal maash" -> "dalmash" vs
  // "daalmaash". Skipped for very short names where merging creates noise.
  const ca = na.replace(/\s/g, '');
  const cb = nb.replace(/\s/g, '');
  const merged =
    ca === cb
      ? 1
      : Math.min(ca.length, cb.length) < 4
        ? 0
        : 1 - levenshtein(ca, cb) / Math.max(ca.length, cb.length);

  return Math.max(lev, tokenScore, contains, merged);
}

/**
 * Ranks stock items against what the merchant said. Returns
 * [{ item, score }] sorted best-first, filtered to score >= minScore.
 */
export async function findSimilarInventoryItems(merchantId, saidName, { limit = 3, minScore = 0.5 } = {}) {
  const items = await InventoryItem.find({ merchantId }).limit(100);
  return items
    .map((item) => ({ item, score: similarity(saidName, item.name) }))
    .filter((m) => m.score >= minScore)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}
