import Order from '../models/Order.js';
import KhataPayment from '../models/KhataPayment.js';

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
