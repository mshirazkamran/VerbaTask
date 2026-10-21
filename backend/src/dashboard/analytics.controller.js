import mongoose from 'mongoose';
import Order from '../models/Order.js';

// Orders that count as revenue. Fully returned, rejected and pending orders do not.
const SALE_STATUSES = ['completed', 'approved', 'partially_returned', 'exchanged'];

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };
const DEFAULT_RANGE = '30d';
const DAY_MS = 24 * 60 * 60 * 1000;
const TZ = 'Asia/Karachi';
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000; // Pakistan has no DST
const TOP_PRODUCTS_LIMIT = 8;
const WEEKS_SHOWN = 12;
const MONTHS_SHOWN = 12;

// --- date helpers (all day keys are Pakistan-local "YYYY-MM-DD") ---------------

const dayKey = (ms) => new Date(ms + PKT_OFFSET_MS).toISOString().slice(0, 10);
const keyToMs = (key) => Date.parse(`${key}T00:00:00Z`);
const addDays = (key, n) => dayKey(keyToMs(key) + n * DAY_MS);
const monthKey = (key) => key.slice(0, 7);
const weekStartKey = (key) => addDays(key, -((new Date(keyToMs(key)).getUTCDay() + 6) % 7)); // Monday

/** Pakistan-local midnight (as a real instant) for the day that `now` falls on. */
const startOfPktDay = (nowMs) => keyToMs(dayKey(nowMs)) - PKT_OFFSET_MS;

const pctChange = (current, previous) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null;

const round = (n) => Math.round((n || 0) * 100) / 100;

// --- pure payload builder (kept free of DB access so it can be unit tested) ---

/**
 * @param {Object} rows
 * @param {Array<{_id:string, revenue:number, orders:number, units:number}>} rows.daily  one row per active day
 * @param {Array} rows.top        top products for the selected range
 * @param {number} [rows.topTotal] gross item revenue across ALL products in the range (denominator for product share)
 * @param {Array} rows.payments   payment-method totals for the selected range
 * @param {Array} rows.hours      orders/revenue per Pakistan-local hour
 * @param {Array} rows.weekdays   orders/revenue per Pakistan-local weekday (Mongo: 1 = Sunday)
 * @param {string} range
 * @param {number} nowMs
 */
export function buildAnalytics({ daily, top, topTotal = 0, payments, hours, weekdays }, range, nowMs = Date.now()) {
  const days = RANGE_DAYS[range];
  const today = dayKey(nowMs);
  const rangeStart = addDays(today, -(days - 1));
  const prevStart = addDays(rangeStart, -days);

  const byDay = new Map(daily.map((d) => [d._id, d]));
  const dayValue = (key) => byDay.get(key) || { revenue: 0, orders: 0, units: 0 };

  // Current vs previous period totals
  const sum = (from, to) => {
    const acc = { revenue: 0, orders: 0, units: 0 };
    for (let k = from; k <= to; k = addDays(k, 1)) {
      const d = dayValue(k);
      acc.revenue += d.revenue;
      acc.orders += d.orders;
      acc.units += d.units;
    }
    return acc;
  };
  const current = sum(rangeStart, today);
  const previous = sum(prevStart, addDays(rangeStart, -1));
  const aov = (s) => (s.orders ? s.revenue / s.orders : 0);

  // Trend: daily points, or monthly points for the 12-month range
  const trend = [];
  if (range === '12m') {
    const months = new Map();
    for (let k = rangeStart; k <= today; k = addDays(k, 1)) {
      const m = monthKey(k);
      const d = dayValue(k);
      const cur = months.get(m) || { date: m, revenue: 0, orders: 0 };
      cur.revenue += d.revenue;
      cur.orders += d.orders;
      months.set(m, cur);
    }
    trend.push(...months.values());
  } else {
    for (let k = rangeStart; k <= today; k = addDays(k, 1)) {
      const d = dayValue(k);
      trend.push({ date: k, revenue: d.revenue, orders: d.orders });
    }
  }

  // Weekly series (last 12 weeks, Monday start) and monthly series (last 12 months)
  const thisWeek = weekStartKey(today);
  const weekly = [];
  for (let i = WEEKS_SHOWN - 1; i >= 0; i--) {
    const start = addDays(thisWeek, -7 * i);
    let revenue = 0;
    let orders = 0;
    for (let j = 0; j < 7; j++) {
      const d = dayValue(addDays(start, j));
      revenue += d.revenue;
      orders += d.orders;
    }
    weekly.push({ date: start, revenue, orders });
  }

  const monthTotals = new Map();
  for (const [k, d] of byDay) monthTotals.set(monthKey(k), (monthTotals.get(monthKey(k)) || 0) + d.revenue);
  const [ty, tm] = today.split('-').map(Number);
  const monthly = [];
  for (let i = MONTHS_SHOWN - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ty, tm - 1 - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    monthly.push({ date: key, revenue: monthTotals.get(key) || 0 });
  }

  // Weekly / monthly averages over the observed history (max 365 days). A shop that
  // started 10 days ago is averaged over 10 days, not padded with empty weeks.
  const firstActive = [...byDay.keys()].sort()[0];
  const historyStart = firstActive && firstActive > addDays(today, -364) ? firstActive : addDays(today, -364);
  const spanDays = firstActive ? Math.max(1, Math.round((keyToMs(today) - keyToMs(historyStart)) / DAY_MS) + 1) : 0;
  let historyRevenue = 0;
  for (const [k, d] of byDay) if (k >= historyStart && k <= today) historyRevenue += d.revenue;
  const weeklyAverage = spanDays ? historyRevenue / Math.max(1, spanDays / 7) : 0;
  const monthlyAverage = spanDays ? historyRevenue / Math.max(1, spanDays / 30.4375) : 0;

  // Best day within the selected range
  let bestDay = null;
  for (let k = rangeStart; k <= today; k = addDays(k, 1)) {
    const d = dayValue(k);
    if (d.revenue > 0 && (!bestDay || d.revenue > bestDay.revenue)) bestDay = { date: k, revenue: d.revenue, orders: d.orders };
  }

  // Top products
  const topProducts = top.map((p) => ({
    name: p._id,
    quantity: round(p.quantity),
    revenue: round(p.revenue),
    share: topTotal ? round((p.revenue / topTotal) * 100) : 0,
  }));

  // Payment methods
  const paymentTotal = payments.reduce((s, p) => s + p.revenue, 0);
  const paymentMethods = payments
    .map((p) => ({
      method: p._id || 'cash',
      revenue: round(p.revenue),
      orders: p.orders,
      share: paymentTotal ? round((p.revenue / paymentTotal) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Busiest hours (0-23) and weekdays (0 = Sunday .. 6 = Saturday)
  const byHour = Array.from({ length: 24 }, (_, hour) => {
    const row = hours.find((h) => h._id === hour);
    return { hour, orders: row?.orders || 0, revenue: round(row?.revenue) };
  });
  const byWeekday = Array.from({ length: 7 }, (_, day) => {
    const row = weekdays.find((w) => w._id === day + 1);
    return { day, orders: row?.orders || 0, revenue: round(row?.revenue) };
  });
  const peakOf = (rows, key) => {
    const best = rows.reduce((a, b) => (b.orders > a.orders ? b : a), rows[0]);
    return best.orders > 0 ? best[key] : null;
  };

  return {
    range,
    days,
    from: rangeStart,
    to: today,
    summary: {
      revenue: round(current.revenue),
      orders: current.orders,
      units: round(current.units),
      avgOrderValue: round(aov(current)),
      // A shop younger than the range is averaged over the days it has actually traded.
      avgDailyRevenue: round(current.revenue / Math.min(days, spanDays || days)),
      bestDay,
      previous: { revenue: round(previous.revenue), orders: previous.orders, avgOrderValue: round(aov(previous)) },
      growth: {
        revenue: pctChange(current.revenue, previous.revenue),
        orders: pctChange(current.orders, previous.orders),
        avgOrderValue: pctChange(aov(current), aov(previous)),
      },
    },
    averages: { weekly: round(weeklyAverage), monthly: round(monthlyAverage), basisDays: spanDays },
    trend,
    weekly,
    monthly,
    topProducts,
    paymentMethods,
    byHour,
    byWeekday,
    peak: { hour: peakOf(byHour, 'hour'), weekday: peakOf(byWeekday, 'day') },
  };
}

// --- HTTP handler --------------------------------------------------------------

/**
 * GET /api/analytics?range=7d|30d|90d|12m
 * Revenue analytics for the authenticated merchant, aggregated in MongoDB.
 */
export const getAnalytics = async (req, res) => {
  try {
    const range = RANGE_DAYS[req.query.range] ? req.query.range : DEFAULT_RANGE;
    const days = RANGE_DAYS[range];
    const merchantId = new mongoose.Types.ObjectId(req.merchantId);

    const nowMs = Date.now();
    const today = dayKey(nowMs);
    const rangeStartMs = keyToMs(addDays(today, -(days - 1))) - PKT_OFFSET_MS;
    // Enough history for the previous period AND the 365-day averages / 12-month chart.
    const historyStartMs = Math.min(rangeStartMs - days * DAY_MS, startOfPktDay(nowMs) - 364 * DAY_MS);

    const baseMatch = { merchantId, status: { $in: SALE_STATUSES } };
    const tz = { timezone: TZ };

    // Revenue per order = total minus anything refunded through returns.
    const withNet = {
      $addFields: {
        net: {
          $max: [0, { $subtract: [{ $ifNull: ['$total', 0] }, { $sum: '$returnHistory.refundAmount' }] }],
        },
        unitCount: { $sum: '$items.quantity' },
      },
    };

    const inRange = { ...baseMatch, createdAt: { $gte: new Date(rangeStartMs) } };

    const [daily, [topFacet], payments, hours, weekdays] = await Promise.all([
      Order.aggregate([
        { $match: { ...baseMatch, createdAt: { $gte: new Date(historyStartMs) } } },
        withNet,
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', ...tz } },
            revenue: { $sum: '$net' },
            orders: { $sum: 1 },
            units: { $sum: '$unitCount' },
          },
        },
      ]),
      Order.aggregate([
        { $match: inRange },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.name',
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: [{ $ifNull: ['$items.quantity', 0] }, { $ifNull: ['$items.price', 0] }] } },
          },
        },
        { $match: { _id: { $ne: null } } },
        {
          $facet: {
            top: [{ $sort: { revenue: -1 } }, { $limit: TOP_PRODUCTS_LIMIT }],
            total: [{ $group: { _id: null, revenue: { $sum: '$revenue' } } }],
          },
        },
      ]),
      Order.aggregate([
        { $match: inRange },
        withNet,
        { $group: { _id: '$paymentMethod', revenue: { $sum: '$net' }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: inRange },
        withNet,
        { $group: { _id: { $hour: { date: '$createdAt', ...tz } }, revenue: { $sum: '$net' }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: inRange },
        withNet,
        { $group: { _id: { $dayOfWeek: { date: '$createdAt', ...tz } }, revenue: { $sum: '$net' }, orders: { $sum: 1 } } },
      ]),
    ]);

    res.json({ success: true, data: buildAnalytics({ daily, top: topFacet.top, topTotal: topFacet.total[0]?.revenue || 0, payments, hours, weekdays }, range, nowMs) });
  } catch (err) {
    console.error('getAnalytics error:', err.message);
    res.status(500).json({ success: false, error: { message: 'Failed to load analytics' } });
  }
};
