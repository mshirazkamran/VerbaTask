import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalytics } from '../src/dashboard/analytics.controller.js';

// Wed 2026-10-21 12:00 Pakistan time
const NOW = Date.parse('2026-10-21T07:00:00Z');

const empty = { daily: [], top: [], payments: [], hours: [], weekdays: [] };

describe('buildAnalytics', () => {
  it('returns zeroed, fully shaped output for a shop with no orders', () => {
    const out = buildAnalytics(empty, '7d', NOW);
    assert.equal(out.summary.revenue, 0);
    assert.equal(out.summary.growth.revenue, null);
    assert.equal(out.trend.length, 7);
    assert.equal(out.weekly.length, 12);
    assert.equal(out.monthly.length, 12);
    assert.equal(out.byHour.length, 24);
    assert.equal(out.byWeekday.length, 7);
    assert.equal(out.averages.weekly, 0);
    assert.equal(out.peak.hour, null);
  });

  it('computes totals, growth vs previous period and best day', () => {
    const daily = [
      { _id: '2026-10-21', revenue: 3000, orders: 3, units: 6 },
      { _id: '2026-10-20', revenue: 1000, orders: 1, units: 2 },
      { _id: '2026-10-10', revenue: 2000, orders: 2, units: 4 }, // previous 7d window
    ];
    const out = buildAnalytics({ ...empty, daily }, '7d', NOW);
    assert.equal(out.summary.revenue, 4000);
    assert.equal(out.summary.orders, 4);
    assert.equal(out.summary.avgOrderValue, 1000);
    assert.equal(out.summary.previous.revenue, 2000);
    assert.equal(out.summary.growth.revenue, 100);
    assert.deepEqual(out.summary.bestDay, { date: '2026-10-21', revenue: 3000, orders: 3 });
  });

  it('averages over observed history, not empty weeks', () => {
    // First sale 14 days ago -> 15-day span; 15000 total
    const daily = [
      { _id: '2026-10-07', revenue: 5000, orders: 5, units: 5 },
      { _id: '2026-10-21', revenue: 10000, orders: 5, units: 5 },
    ];
    const out = buildAnalytics({ ...empty, daily }, '30d', NOW);
    assert.equal(out.averages.basisDays, 15);
    assert.equal(out.averages.weekly, Math.round((15000 / (15 / 7)) * 100) / 100);
  });

  it('buckets weeks from Monday and months by calendar month', () => {
    const daily = [{ _id: '2026-10-19', revenue: 700, orders: 1, units: 1 }]; // Monday
    const out = buildAnalytics({ ...empty, daily }, '30d', NOW);
    const thisWeek = out.weekly[out.weekly.length - 1];
    assert.equal(thisWeek.date, '2026-10-19');
    assert.equal(thisWeek.revenue, 700);
    assert.equal(out.monthly[out.monthly.length - 1].date, '2026-10');
    assert.equal(out.monthly[out.monthly.length - 1].revenue, 700);
  });

  it('uses monthly trend points for the 12m range and maps weekdays/hours', () => {
    const out = buildAnalytics(
      { ...empty, hours: [{ _id: 18, revenue: 500, orders: 4 }], weekdays: [{ _id: 6, revenue: 500, orders: 4 }] },
      '12m',
      NOW
    );
    assert.ok(out.trend.length >= 12 && out.trend.length <= 13);
    assert.equal(out.trend[0].date.length, 7);
    assert.equal(out.peak.hour, 18);
    assert.equal(out.peak.weekday, 5); // Mongo 6 = Friday -> 5
  });
});
