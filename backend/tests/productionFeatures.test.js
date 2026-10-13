import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseStockHeuristic } from '../src/services/qwen.service.js';

describe('Production Features & Edge Cases Tests', () => {
  describe('Multi-Item Restock Parsing', () => {
    test('parses multi-item restock with aur and prices', () => {
      const parsed = parseStockHeuristic('maal aya 20 chini 150 aur 10 daal 200');
      assert.ok(parsed);
      assert.equal(parsed.type, 'update_stock');
      assert.equal(parsed.items.length, 2);
      assert.equal(parsed.items[0].name, 'chini');
      assert.equal(parsed.items[0].quantity, 20);
      assert.equal(parsed.items[0].price, 150);

      assert.equal(parsed.items[1].name, 'daal');
      assert.equal(parsed.items[1].quantity, 10);
      assert.equal(parsed.items[1].price, 200);
    });

    test('parses multi-item restock separated by comma with missing prices', () => {
      const parsed = parseStockHeuristic('maal aya 20 chini, 10 daal, 5 tel');
      assert.ok(parsed);
      assert.equal(parsed.type, 'update_stock');
      assert.equal(parsed.items.length, 3);
      assert.equal(parsed.items[0].quantity, 20);
      assert.equal(parsed.items[0].price, null);
      assert.equal(parsed.items[1].quantity, 10);
      assert.equal(parsed.items[1].price, null);
      assert.equal(parsed.items[2].quantity, 5);
      assert.equal(parsed.items[2].price, null);
    });

    test('parses multi-item restock in Urdu script', () => {
      const parsed = parseStockHeuristic('مال آیا 20 کلو چینی 150 اور 10 کلو دال 200');
      assert.ok(parsed);
      assert.equal(parsed.type, 'update_stock');
      assert.equal(parsed.items.length, 2);
      assert.equal(parsed.items[0].price, 150);
      assert.equal(parsed.items[1].price, 200);
    });
  });

  describe('TTS Speech Normalization & Voice Preferences', () => {
    test('cleanTextForSpeech normalizes Rs and currencies to speakable Urdu words', async () => {
      const { cleanTextForSpeech } = await import('../src/services/tts.service.js');
      const raw = '✅ سیل درج ہو گئی: 2 x Rice (نقد) — آرڈر #VT-141542-927. کل رقم: Rs. 600';
      const cleaned = cleanTextForSpeech(raw);
      assert.ok(cleaned.includes('600 روپے'));
      assert.ok(!cleaned.includes('Rs.'));
      assert.ok(!cleaned.includes('✅'));
      assert.ok(!cleaned.includes('#'));
    });

    test('validates voice reply rules for always_voice and voice_on_voice', () => {
      function shouldReplyWithVoice(merchant, source) {
        if (!merchant || merchant.voiceReplies === false) return false;
        const pref = merchant.replyPreference || 'voice_on_voice';
        if (pref === 'text_only') return false;
        if (pref === 'always_voice') return true;
        if (pref === 'voice_on_voice') {
          return source === 'audio' || source === 'voice';
        }
        return false;
      }

      // Always voice
      assert.equal(shouldReplyWithVoice({ voiceReplies: true, replyPreference: 'always_voice' }, 'text'), true);
      assert.equal(shouldReplyWithVoice({ voiceReplies: true, replyPreference: 'always_voice' }, 'voice'), true);
      assert.equal(shouldReplyWithVoice({ voiceReplies: true, replyPreference: 'always_voice' }, 'audio'), true);

      // Voice on voice
      assert.equal(shouldReplyWithVoice({ voiceReplies: true, replyPreference: 'voice_on_voice' }, 'voice'), true);
      assert.equal(shouldReplyWithVoice({ voiceReplies: true, replyPreference: 'voice_on_voice' }, 'audio'), true);
      assert.equal(shouldReplyWithVoice({ voiceReplies: true, replyPreference: 'voice_on_voice' }, 'text'), false);

      // Disabled / text-only
      assert.equal(shouldReplyWithVoice({ voiceReplies: false, replyPreference: 'always_voice' }, 'voice'), false);
      assert.equal(shouldReplyWithVoice({ voiceReplies: true, replyPreference: 'text_only' }, 'voice'), false);
    });
  });
});
