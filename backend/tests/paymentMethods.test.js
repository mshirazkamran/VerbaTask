import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAllPaymentMethods,
  isValidPaymentMethod,
  normalizePaymentMethod,
  getPaymentMethodDetails,
} from '../src/constants/paymentMethods.js';
import { formatPaymentMethod } from '../src/services/localization.service.js';

describe('Pakistani Banks & Payment Platforms Catalog Tests', () => {
  test('registers all major Pakistani payment methods and banks', () => {
    const methods = getAllPaymentMethods();
    assert.ok(methods.length >= 20, `Expected at least 20 payment channels, found ${methods.length}`);

    // Verify key wallets & EMIs exist
    const ids = methods.map((m) => m.id);
    assert.ok(ids.includes('cash'));
    assert.ok(ids.includes('easypaisa'));
    assert.ok(ids.includes('jazzcash'));
    assert.ok(ids.includes('sadapay'));
    assert.ok(ids.includes('nayapay'));
    assert.ok(ids.includes('raast'));
    assert.ok(ids.includes('zindigi'));
    assert.ok(ids.includes('upaisa'));

    // Verify major commercial and Islamic banks exist
    assert.ok(ids.includes('meezan'));
    assert.ok(ids.includes('hbl'));
    assert.ok(ids.includes('ubl'));
    assert.ok(ids.includes('mcb'));
    assert.ok(ids.includes('alfalah'));
    assert.ok(ids.includes('faysal'));
    assert.ok(ids.includes('allied'));
    assert.ok(ids.includes('askari'));
  });

  test('validates recognized and unrecognized payment method IDs', () => {
    assert.equal(isValidPaymentMethod('sadapay'), true);
    assert.equal(isValidPaymentMethod('meezan'), true);
    assert.equal(isValidPaymentMethod('raast'), true);
    assert.equal(isValidPaymentMethod('hbl'), true);
    assert.equal(isValidPaymentMethod('paypal'), false);
    assert.equal(isValidPaymentMethod('crypto'), false);
  });

  test('normalizes spoken and typed aliases into canonical IDs', () => {
    assert.equal(normalizePaymentMethod('sada pay'), 'sadapay');
    assert.equal(normalizePaymentMethod('SadaPay'), 'sadapay');
    assert.equal(normalizePaymentMethod('سادا پے'), 'sadapay');
    assert.equal(normalizePaymentMethod('naya pay'), 'nayapay');
    assert.equal(normalizePaymentMethod('نیا پے'), 'nayapay');
    assert.equal(normalizePaymentMethod('raast id'), 'raast');
    assert.equal(normalizePaymentMethod('راست'), 'raast');
    assert.equal(normalizePaymentMethod('meezan bank'), 'meezan');
    assert.equal(normalizePaymentMethod('میزان بینک'), 'meezan');
    assert.equal(normalizePaymentMethod('habib bank'), 'hbl');
    assert.equal(normalizePaymentMethod('bank alfalah'), 'alfalah');
    assert.equal(normalizePaymentMethod('easy-paisa'), 'easypaisa');
    assert.equal(normalizePaymentMethod('jazz cash'), 'jazzcash');
  });

  test('formats payment method names for Urdu and English spoken output', () => {
    assert.equal(formatPaymentMethod('sadapay', 'ur'), 'سادا پے');
    assert.equal(formatPaymentMethod('sadapay', 'en'), 'SadaPay');

    assert.equal(formatPaymentMethod('nayapay', 'ur'), 'نیا پے');
    assert.equal(formatPaymentMethod('nayapay', 'en'), 'NayaPay');

    assert.equal(formatPaymentMethod('raast', 'ur'), 'راست');
    assert.equal(formatPaymentMethod('raast', 'en'), 'Raast');

    assert.equal(formatPaymentMethod('meezan', 'ur'), 'میزان بینک');
    assert.equal(formatPaymentMethod('meezan', 'en'), 'Meezan Bank');

    assert.equal(formatPaymentMethod('hbl', 'ur'), 'ایچ بی ایل');
    assert.equal(formatPaymentMethod('hbl', 'en'), 'HBL (Habib Bank Limited)');
  });

  test('provides metadata details for payment channels', () => {
    const sadapay = getPaymentMethodDetails('sadapay');
    assert.equal(sadapay.name, 'SadaPay');
    assert.equal(sadapay.category, 'emi');

    const meezan = getPaymentMethodDetails('meezan');
    assert.equal(meezan.name, 'Meezan Bank');
    assert.equal(meezan.category, 'bank');
  });
});
