import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeWorkflow,
  matchesMessageTrigger,
  isBelowThreshold,
  computeNextRunAt,
  describeWorkflow,
  parseTime,
} from '../src/workflows/workflow.rules.js';

describe('Workflow rules', () => {
  describe('normalizeWorkflow — rejects anything that is not a real automation', () => {
    test('rejects an invented action ("remove my clothes")', () => {
      const r = normalizeWorkflow({
        trigger: 'threshold',
        condition: { item: null, operator: '<', value: 5 },
        action: { type: 'remove_clothes' },
      });
      assert.equal(r.ok, false);
      assert.equal(r.error.code, 'UNSUPPORTED_ACTION');
    });

    test('rejects an unknown trigger', () => {
      const r = normalizeWorkflow({ trigger: 'weather', condition: {}, action: { type: 'notify', message: 'hi' } });
      assert.equal(r.error.code, 'UNSUPPORTED_TRIGGER');
    });

    test('rejects an unknown report type', () => {
      const r = normalizeWorkflow({
        trigger: 'schedule',
        condition: { frequency: 'daily', time: '21:00' },
        action: { type: 'send_report', reportType: 'horoscope' },
      });
      assert.equal(r.error.code, 'UNSUPPORTED_REPORT');
    });

    test('rejects "above" stock thresholds', () => {
      const r = normalizeWorkflow({
        trigger: 'threshold',
        condition: { item: 'rice', operator: '>', value: 5 },
        action: { type: 'notify' },
      });
      assert.equal(r.error.code, 'UNSUPPORTED_OPERATOR');
    });

    test('rejects a threshold with no number', () => {
      const r = normalizeWorkflow({ trigger: 'threshold', condition: { item: 'rice' }, action: { type: 'notify' } });
      assert.equal(r.error.code, 'MISSING_THRESHOLD');
    });

    test('rejects a message shortcut that collides with a built-in command', () => {
      const r = normalizeWorkflow({
        trigger: 'message',
        condition: { keywords: ['Report'] },
        action: { type: 'send_report', reportType: 'sales' },
      });
      assert.equal(r.error.code, 'RESERVED_KEYWORD');
      assert.equal(r.error.keyword, 'report');
    });

    test('rejects a schedule without a time', () => {
      const r = normalizeWorkflow({ trigger: 'schedule', condition: { frequency: 'daily' }, action: { type: 'notify', message: 'x' } });
      assert.equal(r.error.code, 'MISSING_TIME');
    });

    test('rejects a scheduled notify with no message', () => {
      const r = normalizeWorkflow({ trigger: 'schedule', condition: { time: '09:00' }, action: { type: 'notify' } });
      assert.equal(r.error.code, 'MISSING_MESSAGE');
    });
  });

  describe('normalizeWorkflow — canonicalizes supported automations', () => {
    test('stock threshold with legacy quantityThreshold', () => {
      const r = normalizeWorkflow({ trigger: 'threshold', condition: { quantityThreshold: '5' }, action: { type: 'notify_merchant' } });
      assert.equal(r.ok, true);
      assert.deepEqual(r.value.condition, { item: null, operator: '<', value: 5 });
      assert.deepEqual(r.value.action, { type: 'notify' });
    });

    test('"reaches 0" becomes <= 0', () => {
      const r = normalizeWorkflow({ trigger: 'threshold', condition: { item: 'milk', value: 0 }, action: { type: 'notify' } });
      assert.equal(r.value.condition.operator, '<=');
    });

    test('"when I say end, send end day report" → message + sales report', () => {
      const r = normalizeWorkflow({
        trigger: 'message',
        condition: { keywords: [' End. '] },
        action: { type: 'send_report', reportType: 'end_of_day' },
      });
      assert.equal(r.ok, true);
      assert.deepEqual(r.value.condition, { keywords: ['end'] });
      assert.deepEqual(r.value.action, { type: 'send_report', reportType: 'sales' });
    });

    test('weekly schedule from a day name and 12h time', () => {
      const r = normalizeWorkflow({
        trigger: 'schedule',
        condition: { time: '10am', day: 'monday' },
        action: { type: 'send_report', reportType: 'inventory' },
      });
      assert.deepEqual(r.value.condition, { frequency: 'weekly', time: '10:00', dayOfWeek: 1 });
    });
  });

  test('parseTime handles common formats', () => {
    assert.equal(parseTime('21:00'), '21:00');
    assert.equal(parseTime('9pm'), '21:00');
    assert.equal(parseTime('9:30 PM'), '21:30');
    assert.equal(parseTime('12am'), '00:00');
    assert.equal(parseTime(7), '07:00');
    assert.equal(parseTime('25:00'), null);
    assert.equal(parseTime('soon'), null);
  });

  test('message triggers match the exact word only', () => {
    const cond = { keywords: ['end'] };
    assert.equal(matchesMessageTrigger(cond, 'End'), true);
    assert.equal(matchesMessageTrigger(cond, '  end! '), true);
    assert.equal(matchesMessageTrigger(cond, 'send 2 rice'), false);
    assert.equal(matchesMessageTrigger(cond, 'end report'), false);
  });

  test('isBelowThreshold respects the operator', () => {
    assert.equal(isBelowThreshold({ operator: '<', value: 5 }, 4), true);
    assert.equal(isBelowThreshold({ operator: '<', value: 5 }, 5), false);
    assert.equal(isBelowThreshold({ operator: '<=', value: 0 }, 0), true);
    assert.equal(isBelowThreshold({ quantityThreshold: 5 }, 3), true);
  });

  describe('computeNextRunAt (Pakistan time, UTC+5)', () => {
    test('daily 21:00 PKT later today', () => {
      // 10:00 UTC = 15:00 PKT → next is 21:00 PKT = 16:00 UTC same day
      const next = computeNextRunAt({ frequency: 'daily', time: '21:00' }, new Date('2026-10-08T10:00:00Z'));
      assert.equal(next.toISOString(), '2026-10-08T16:00:00.000Z');
    });

    test('daily time already passed rolls to tomorrow', () => {
      const next = computeNextRunAt({ frequency: 'daily', time: '09:00' }, new Date('2026-10-08T10:00:00Z'));
      assert.equal(next.toISOString(), '2026-10-09T04:00:00.000Z');
    });

    test('just after midnight PKT uses the PKT date, not the UTC date', () => {
      // 19:30 UTC Oct 8 = 00:30 PKT Oct 9 → 09:00 PKT Oct 9
      const next = computeNextRunAt({ frequency: 'daily', time: '09:00' }, new Date('2026-10-08T19:30:00Z'));
      assert.equal(next.toISOString(), '2026-10-09T04:00:00.000Z');
    });

    test('weekly Monday 10:00 PKT', () => {
      // 2026-10-08 is a Thursday → next Monday is 2026-10-12
      const next = computeNextRunAt({ frequency: 'weekly', time: '10:00', dayOfWeek: 1 }, new Date('2026-10-08T10:00:00Z'));
      assert.equal(next.toISOString(), '2026-10-12T05:00:00.000Z');
    });

    test('weekly on the same day after the time rolls a full week', () => {
      const next = computeNextRunAt({ frequency: 'weekly', time: '09:00', dayOfWeek: 4 }, new Date('2026-10-08T10:00:00Z'));
      assert.equal(next.toISOString(), '2026-10-15T04:00:00.000Z');
    });

    test('legacy interval rows still advance', () => {
      const from = new Date('2026-10-08T10:00:00Z');
      assert.equal(computeNextRunAt({ intervalMinutes: 60 }, from).toISOString(), '2026-10-08T11:00:00.000Z');
    });
  });

  test('describeWorkflow reads back what was saved', () => {
    assert.equal(
      describeWorkflow({ trigger: 'threshold', condition: { item: 'Rice', operator: '<', value: 5 }, action: { type: 'notify' } }, 'en'),
      'When Rice stock drops below 5 → alert you'
    );
    assert.equal(
      describeWorkflow({ trigger: 'schedule', condition: { frequency: 'daily', time: '21:00' }, action: { type: 'send_report', reportType: 'sales' } }, 'en'),
      "Every day at 9:00 PM → send you today's sales report"
    );
    assert.equal(
      describeWorkflow({ trigger: 'message', condition: { keywords: ['end'] }, action: { type: 'send_report', reportType: 'sales' } }, 'en'),
      `When you send "end" → send you today's sales report`
    );
  });
});
