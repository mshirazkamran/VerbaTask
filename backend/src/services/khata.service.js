import Order from '../models/Order.js';
import KhataPayment from '../models/KhataPayment.js';
import { levenshtein, simplifyPhonetic } from '../crm/item-matching.js';

/**
 * Records one payment toward a customer's khata so reports can show when it came in.
 * Never throws: the balance change that triggered it must not fail because history logging did.
 */
export async function recordKhataPayment({ merchantId, customerId, amount, balanceAfter, source = 'text' }) {
  try {
    return await KhataPayment.create({ merchantId, customerId, amount, balanceAfter, source });
  } catch (err) {
    console.error('[khata] failed to record payment history:', err.message);
    return null;
  }
}

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Builds a customer's khata statement as chronological rows with a running balance.
 * Pure function: callers load the orders and payments.
 *
 * Customer.balance is the source of truth and may include amounts from before purchases and
 * payments were recorded (or edited by hand on the dashboard), so any difference between it
 * and the recorded history is shown as one explicit "Earlier balance / adjustments" row —
 * the statement always ends exactly on the real outstanding balance.
 */
export function buildKhataStatement({ customer, orders = [], payments = [] }) {
  const entries = [];

  for (const order of orders) {
    // Waiting for approval or rejected: never charged to the khata, so not a purchase.
    if (order.status === 'pending_approval' || order.status === 'rejected') continue;
    const items = (order.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ');
    const tag = ['rejected', 'returned', 'partially_returned'].includes(order.status) ? ` (${order.status.replace('_', ' ')})` : '';
    entries.push({
      date: new Date(order.createdAt),
      type: 'purchase',
      details: `${items || 'Items'}${order.orderNumber ? ` [${order.orderNumber}]` : ''}${tag}`,
      debit: money(order.total),
      credit: 0,
    });

    for (const ret of order.returnHistory || []) {
      if (!ret.refundAmount) continue;
      const returned = (ret.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ');
      entries.push({
        date: new Date(ret.returnedAt || order.updatedAt || order.createdAt),
        type: 'return',
        details: `Return: ${returned || 'items'}${order.orderNumber ? ` [${order.orderNumber}]` : ''}`,
        debit: 0,
        credit: money(ret.refundAmount),
      });
    }
  }

  for (const payment of payments) {
    entries.push({
      date: new Date(payment.createdAt),
      type: 'payment',
      details: 'Payment received',
      debit: 0,
      credit: money(payment.amount),
    });
  }

  entries.sort((a, b) => a.date - b.date);

  const totalDebit = money(entries.reduce((sum, e) => sum + e.debit, 0));
  const totalCredit = money(entries.reduce((sum, e) => sum + e.credit, 0));
  const balance = money(customer.balance);
  const adjustment = money(balance - (totalDebit - totalCredit));

  const rows = [];
  if (Math.abs(adjustment) >= 0.5) {
    rows.push({
      date: new Date(entries[0]?.date || customer.createdAt || Date.now()),
      type: 'opening',
      details: 'Earlier balance / adjustments',
      debit: adjustment > 0 ? adjustment : 0,
      credit: adjustment < 0 ? -adjustment : 0,
    });
  }
  rows.push(...entries);

  let running = 0;
  for (const row of rows) {
    running = money(running + row.debit - row.credit);
    row.balance = running;
  }

  const purchases = entries.filter((e) => e.type === 'purchase');
  const paid = money(totalCredit + (adjustment < 0 ? -adjustment : 0));
  const purchased = money(totalDebit + (adjustment > 0 ? adjustment : 0));

  return {
    rows,
    totals: { purchased, paid, balance, purchaseCount: purchases.length },
  };
}

/** Loads a customer's udhaar orders and payments and builds their statement. */
export async function getKhataStatement(merchantId, customer) {
  const [orders, payments] = await Promise.all([
    Order.find({ merchantId, customerId: customer._id, paymentMethod: 'udhaar' }).sort({ createdAt: 1 }),
    KhataPayment.find({ merchantId, customerId: customer._id }).sort({ createdAt: 1 }),
  ]);
  return buildKhataStatement({ customer, orders, payments });
}

// Politeness words that don't tell two customers apart ("ali" and "ali bhai" are the same person).
const KHATA_HONORIFICS = new Set(['bhai', 'bhae', 'bhaiya', 'bhaijan', 'bhaijaan', 'sahab', 'sahib', 'saheb', 'sb', 'ji', 'janab', 'بھائی', 'صاحب', 'جی']);

const nameWords = (name) => String(name || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
const withoutHonorifics = (words) => {
  const core = words.filter((w) => !KHATA_HONORIFICS.has(w));
  return core.length ? core : words;
};

/** Same word, allowing spelling slips in voice transcripts ("shikhy" ~ "sheikhy"). */
function sameNameWord(a, b) {
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) return false;
  const pa = simplifyPhonetic(a);
  if (pa && pa === simplifyPhonetic(b)) return true;
  return a.length >= 4 && b.length >= 4 && 1 - levenshtein(a, b) / Math.max(a.length, b.length) >= 0.8;
}

// Exact spelling only: a typo'd name is never applied to a khata without the merchant confirming it.
const sameWords = (a, b) => a.length === b.length && a.every((w, i) => w === b[i]);

/**
 * Decides which khata a spoken name refers to, from the merchant's customers.
 *
 * Returns { match } only when exactly one khata fits the name exactly AND no other khata also
 * contains every word said — "ali bhai" is ali bhai, but plain "ali" could be "ali bhai" or
 * "ali sheikhy town wala". Otherwise returns { candidates } (best first, max 9) so the merchant
 * can confirm; an empty list means no khata resembles the name.
 */
export function rankKhataCustomers(customers, spokenName) {
  const spokenFull = nameWords(spokenName);
  if (!spokenFull.length) return { match: null, candidates: [] };
  const spokenCore = withoutHonorifics(spokenFull);

  const scored = (customers || []).filter((c) => c?.name).map((customer) => {
    const full = nameWords(customer.name);
    const core = withoutHonorifics(full);
    const matched = spokenCore.filter((w) => core.some((cw) => sameNameWord(w, cw))).length;
    return {
      customer,
      exact: sameWords(full, spokenFull) || sameWords(core, spokenCore),
      // Every word said (honorifics included) appears in this name: a rival for the same words.
      containsAllSaid: spokenFull.every((w) => full.some((cw) => sameNameWord(w, cw))),
      matched,
      coverage: matched / core.length,
    };
  });

  const exact = scored.filter((s) => s.exact);
  const rivals = scored.filter((s) => !s.exact && s.containsAllSaid);
  if (exact.length === 1 && rivals.length === 0) return { match: exact[0].customer, candidates: [] };

  const candidates = scored
    .filter((s) => s.exact || s.matched > 0)
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.matched - a.matched || b.coverage - a.coverage)
    .slice(0, 9)
    .map((s) => s.customer);
  return { match: null, candidates };
}

/**
 * Reads the merchant's answer to "which khata?" — a number ("2"), or a name typed/spoken
 * ("Ali sheikhy bhai"). Returns the chosen candidate, or null when the answer doesn't pick one.
 */
export function pickKhataCandidate(candidates, answer) {
  const text = String(answer || '').trim();
  const index = text.match(/^(\d)\.?$/);
  if (index) return candidates[Number(index[1]) - 1] || null;

  const { match, candidates: ranked } = rankKhataCustomers(candidates, text);
  if (match) return match;
  if (!ranked.length) return null;
  // A clear winner: strictly more of the said words than the runner-up.
  const said = withoutHonorifics(nameWords(text));
  const score = (c) => said.filter((w) => withoutHonorifics(nameWords(c.name)).some((cw) => sameNameWord(w, cw))).length;
  if (ranked.length === 1) return score(ranked[0]) > 0 ? ranked[0] : null;
  return score(ranked[0]) > score(ranked[1]) ? ranked[0] : null;
}
