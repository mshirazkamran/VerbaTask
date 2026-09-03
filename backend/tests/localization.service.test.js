import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spokenPhrases } from '../src/services/localization.service.js';

describe('Localization Service Tests', () => {
  describe('orderLogged', () => {
    test('formats Urdu spoken and text correctly', () => {
      const { spoken, text } = spokenPhrases.orderLogged('ur', {
        quantity: 2,
        itemName: 'چاول',
        paymentMethod: 'cash',
        orderNo: '123456',
      });
      assert.ok(spoken.includes('آپ کی سیل درج کر لی گئی ہے'));
      assert.ok(spoken.includes('۲ چاول') || spoken.includes('2 چاول'));
      assert.ok(spoken.includes('نقد'));
      assert.ok(text.includes('✅'));
      assert.ok(text.includes('123456'));
    });

    test('formats English spoken and text correctly', () => {
      const { spoken, text } = spokenPhrases.orderLogged('en', {
        quantity: 3,
        itemName: 'Rice',
        paymentMethod: 'cash',
        orderNo: '789012',
      });
      assert.ok(spoken.includes('Your sale has been logged'));
      assert.ok(spoken.includes('3 Rice'));
      assert.ok(text.includes('✅ Logged: 3 x Rice'));
    });
  });

  describe('insufficientStock', () => {
    test('formats Urdu and English responses', () => {
      const ur = spokenPhrases.insufficientStock('ur', { detail: 'Only 1 left' });
      assert.ok(ur.spoken.includes('معذرت'));
      assert.ok(ur.text.includes('اسٹاک کافی نہیں'));

      const en = spokenPhrases.insufficientStock('en', { detail: 'Only 1 left' });
      assert.ok(en.spoken.includes('Not enough stock') || en.spoken.includes('not enough stock'));
      assert.ok(en.text.includes('Only 1 left'));
    });
  });

  describe('itemNotFound and itemDisambiguation', () => {
    test('formats itemNotFound in Urdu and English', () => {
      const ur = spokenPhrases.itemNotFound('ur', { saidName: 'آٹا' });
      assert.ok(ur.spoken.includes('آٹا'));
      const en = spokenPhrases.itemNotFound('en', { saidName: 'flour' });
      assert.ok(en.spoken.includes('flour'));
    });

    test('formats itemDisambiguation in Urdu with candidates', () => {
      const res = spokenPhrases.itemDisambiguation('ur', {
        saidName: 'تیل',
        candidates: ['ڈالڈا کوکنگ آئل', 'صوفی آئل'],
      });
      assert.ok(res.spoken.includes('ڈالڈا کوکنگ آئل یا صوفی آئل'));
      assert.ok(res.text.includes('تیل'));
    });
  });

  describe('unrecognizedIntent and voiceProcessingError', () => {
    test('provides natural spoken guidance in Urdu', () => {
      const unk = spokenPhrases.unrecognizedIntent('ur');
      assert.ok(unk.spoken.length > 10);
      const err = spokenPhrases.voiceProcessingError('ur');
      assert.ok(err.spoken.includes('وائس نوٹ'));
    });
  });

  describe('onboarding phrases', () => {
    test('provides onboarding stock and complete messages', () => {
      const complete = spokenPhrases.onboardingComplete('ur', 5);
      assert.ok(complete.spoken.includes('مبارک ہو'));
      assert.ok(complete.spoken.includes('5'));
    });
  });
});
