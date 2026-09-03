import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { cleanTextForSpeech, getDefaultVoice, synthesizeSpeech } from '../src/services/tts.service.js';

describe('TTS Service Unit & Integration Tests', () => {
  describe('cleanTextForSpeech', () => {
    test('removes markdown formatting', () => {
      const input = 'This is *bold* and _italic_ and `code` and ~strike~';
      const output = cleanTextForSpeech(input);
      assert.equal(output, 'This is bold and italic and code and strike');
    });

    test('removes emojis and symbols', () => {
      const input = '✅ آرڈر #123456 درج ہو گیا ہے! 👋📦';
      const output = cleanTextForSpeech(input);
      assert.equal(output, 'آرڈر 123456 درج ہو گیا ہے!');
    });

    test('removes URLs', () => {
      const input = 'Visit our site at https://example.com/signup for details.';
      const output = cleanTextForSpeech(input);
      assert.equal(output, 'Visit our site at for details.');
    });

    test('handles empty or non-string inputs', () => {
      assert.equal(cleanTextForSpeech(''), '');
      assert.equal(cleanTextForSpeech(null), '');
      assert.equal(cleanTextForSpeech(undefined), '');
    });
  });

  describe('getDefaultVoice', () => {
    test('returns Urdu voice for ur', () => {
      const voice = getDefaultVoice('ur');
      assert.match(voice, /ur-PK/);
    });

    test('returns English voice for en', () => {
      const voice = getDefaultVoice('en');
      assert.match(voice, /en-US/);
    });
  });

  describe('synthesizeSpeech', () => {
    test('synthesizes natural Urdu audio via Edge TTS', async () => {
      const res = await synthesizeSpeech('آپ کا آرڈر درج کر لیا گیا ہے', { language: 'ur' });
      assert.ok(res);
      assert.ok(Buffer.isBuffer(res.buffer));
      assert.ok(res.buffer.length > 1000, `Expected buffer length > 1000, got ${res.buffer.length}`);
      assert.equal(res.mimeType, 'audio/mpeg');
      assert.equal(res.format, 'mp3');
    });

    test('synthesizes English audio via Edge TTS', async () => {
      const res = await synthesizeSpeech('Your order has been recorded successfully', { language: 'en' });
      assert.ok(res);
      assert.ok(Buffer.isBuffer(res.buffer));
      assert.ok(res.buffer.length > 1000, `Expected buffer length > 1000, got ${res.buffer.length}`);
      assert.equal(res.mimeType, 'audio/mpeg');
      assert.equal(res.format, 'mp3');
    });

    test('synthesizes audio via Google TTS fallback provider', async () => {
      const res = await synthesizeSpeech('ٹیسٹ آرڈر', { language: 'ur', provider: 'google' });
      assert.ok(res);
      assert.ok(Buffer.isBuffer(res.buffer));
      assert.ok(res.buffer.length > 500);
      assert.equal(res.provider, 'google');
    });

    test('throws error if text is empty after cleaning', async () => {
      await assert.rejects(
        () => synthesizeSpeech('   👋📦  '),
        /TTS: text is empty after cleaning/
      );
    });
  });
});
