import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { VOICE_PROFILES, getVoiceForGender } from '../src/services/tts.service.js';
import { spokenPhrases } from '../src/services/localization.service.js';
import {
  parseVoiceGenderChange,
  handleVoiceGenderChange,
  findCustomerByFuzzyName,
  handleKhataSettle,
  handleKhataInquiry,
  __setTestSender,
} from '../src/controllers/whatsapp.controller.js';
import {
  parseKhataSettleHeuristic,
  parseKhataInquiryHeuristic,
  normalizeNumberWords,
} from '../src/services/qwen.service.js';
import Customer from '../src/models/Customer.js';
import KhataPayment from '../src/models/KhataPayment.js';

describe('Khata Settlement & Single-Voice Avatar Customization Tests', () => {
  describe('Single-Voice Policy & VOICE_PROFILES Mapping', () => {
    test('defines authoritative single-voice mapping for exactly 1 Female and 1 Male voice', () => {
      assert.ok(VOICE_PROFILES.female, 'Female profile exists');
      assert.ok(VOICE_PROFILES.male, 'Male profile exists');

      // Edge TTS: Uzma for Urdu, Jenny for English
      assert.equal(VOICE_PROFILES.female.edge.ur, 'ur-PK-UzmaNeural');
      assert.equal(VOICE_PROFILES.female.edge.en, 'en-US-JennyNeural');

      // Edge TTS: Asad for Urdu, Guy for English
      assert.equal(VOICE_PROFILES.male.edge.ur, 'ur-PK-AsadNeural');
      assert.equal(VOICE_PROFILES.male.edge.en, 'en-US-GuyNeural');

      // Gemini: Aoede (Female), Algieba (Male, Urdu) / Puck (Male, English)
      assert.equal(VOICE_PROFILES.female.gemini.ur, 'Aoede');
      assert.equal(VOICE_PROFILES.female.gemini.en, 'Aoede');
      assert.equal(VOICE_PROFILES.male.gemini.ur, 'Algieba');
      assert.equal(VOICE_PROFILES.male.gemini.en, 'Puck');
    });

    test('getVoiceForGender routes to the single designated voice for gender and provider', () => {
      assert.equal(getVoiceForGender('female', 'ur', 'edge'), 'ur-PK-UzmaNeural');
      assert.equal(getVoiceForGender('male', 'ur', 'edge'), 'ur-PK-AsadNeural');
      assert.equal(getVoiceForGender('female', 'en', 'edge'), 'en-US-JennyNeural');
      assert.equal(getVoiceForGender('male', 'en', 'edge'), 'en-US-GuyNeural');
      assert.equal(getVoiceForGender('female', 'ur', 'gemini'), 'Aoede');
      assert.equal(getVoiceForGender('male', 'ur', 'gemini'), 'Algieba');
      // Defaults to female if unrecognized
      assert.equal(getVoiceForGender('other', 'ur', 'edge'), 'ur-PK-UzmaNeural');
    });
  });

  describe('Courteous & Polite Spoken Phrasing', () => {
    test('khataSettled contains polite honorifics and respectful tone in Urdu', () => {
      const phrases = spokenPhrases.khataSettled('ur', {
        customerName: 'علی',
        amount: 500,
        previousBalance: 1500,
        remainingBalance: 1000,
      });

      assert.ok(phrases.spoken.includes('محترم'), 'Includes respectful title محترم');
      assert.ok(phrases.spoken.includes('جزاک اللہ') || phrases.spoken.includes('شکریہ'), 'Includes courteous closing');
      assert.ok(phrases.spoken.includes('500 روپے جمع کر لیے گئے ہیں'), 'Confirms settled amount');
      assert.ok(phrases.spoken.includes('1000'), 'Confirms remaining balance');
      assert.ok(phrases.text.includes('کھاتہ وصولی درج ہو گئی'));
    });

    test('khataSettled formats polite confirmation in English', () => {
      const phrases = spokenPhrases.khataSettled('en', {
        customerName: 'Ali',
        amount: 500,
        previousBalance: 1500,
        remainingBalance: 1000,
      });

      assert.ok(phrases.spoken.includes('Thank you') || phrases.spoken.includes('Payment of Rs. 500'));
      assert.ok(phrases.spoken.includes('Ali'));
      assert.ok(phrases.spoken.includes('1000'));
    });

    test('voiceSwitched gives polite confirmation in requested voice gender', () => {
      const femaleUr = spokenPhrases.voiceSwitched('ur', 'female');
      assert.ok(femaleUr.spoken.includes('عورت') || femaleUr.spoken.includes('خاتون'));
      assert.ok(femaleUr.spoken.includes('محترم'));

      const maleUr = spokenPhrases.voiceSwitched('ur', 'male');
      assert.ok(maleUr.spoken.includes('مرد'));
      assert.ok(maleUr.spoken.includes('محترم'));

      const maleEn = spokenPhrases.voiceSwitched('en', 'male');
      assert.ok(maleEn.spoken.toLowerCase().includes('male voice'));
    });
  });

  describe('parseVoiceGenderChange Heuristics', () => {
    test('parses female voice commands from text or voice transcripts', () => {
      assert.equal(parseVoiceGenderChange('aurat ki awaz'), 'female');
      assert.equal(parseVoiceGenderChange('female voice'), 'female');
      assert.equal(parseVoiceGenderChange('larki ki awaz'), 'female');
      assert.equal(parseVoiceGenderChange('khatoon ki awaz'), 'female');
      assert.equal(parseVoiceGenderChange('عورت کی آواز'), 'female');
      assert.equal(parseVoiceGenderChange('لڑکی کی آواز'), 'female');
      assert.equal(parseVoiceGenderChange('voice ko female karo'), 'female');
    });

    test('parses male voice commands from text or voice transcripts', () => {
      assert.equal(parseVoiceGenderChange('mard ki awaz'), 'male');
      assert.equal(parseVoiceGenderChange('male voice'), 'male');
      assert.equal(parseVoiceGenderChange('larke ki awaz'), 'male');
      assert.equal(parseVoiceGenderChange('مرد کی آواز'), 'male');
      assert.equal(parseVoiceGenderChange('voice male kar do'), 'male');
    });

    test('parses toggle voice commands', () => {
      assert.equal(parseVoiceGenderChange('awaz badlo'), 'toggle');
      assert.equal(parseVoiceGenderChange('change voice'), 'toggle');
      assert.equal(parseVoiceGenderChange('switch voice'), 'toggle');
      assert.equal(parseVoiceGenderChange('آواز بدلو'), 'toggle');
    });

    test('returns null for unrelated text', () => {
      assert.equal(parseVoiceGenderChange('2 doodh cash'), null);
      assert.equal(parseVoiceGenderChange('ali ne 500 diye'), null);
      assert.equal(parseVoiceGenderChange(null), null);
    });
  });

  describe('parseKhataSettleHeuristic & Number Words', () => {
    test('converts Roman Urdu and Urdu word numbers correctly', () => {
      assert.equal(normalizeNumberWords('panch sau rupay'), '500 rupay');
      assert.equal(normalizeNumberWords('ek hazar rupay'), '1000 rupay');
      assert.equal(normalizeNumberWords('پانچ سو علی نے دیے'), '500 علی نے دیے');
      assert.equal(normalizeNumberWords('ایک ہزار'), '1000');
    });

    test('parses classic settlement patterns in Roman Urdu', () => {
      const r1 = parseKhataSettleHeuristic('ali ne 500 diye');
      assert.ok(r1);
      assert.equal(r1.type, 'settle_khata');
      assert.equal(r1.customerName.toLowerCase(), 'ali');
      assert.equal(r1.amount, 500);

      const r2 = parseKhataSettleHeuristic('ali se 500 wasool hue');
      assert.ok(r2);
      assert.equal(r2.customerName.toLowerCase(), 'ali');
      assert.equal(r2.amount, 500);

      const r3 = parseKhataSettleHeuristic('settle 1000 rashid');
      assert.ok(r3);
      assert.equal(r3.customerName.toLowerCase(), 'rashid');
      assert.equal(r3.amount, 1000);

      const r4 = parseKhataSettleHeuristic('jama karo 300 usman');
      assert.ok(r4);
      assert.equal(r4.customerName.toLowerCase(), 'usman');
      assert.equal(r4.amount, 300);

      const r5 = parseKhataSettleHeuristic('500 diye ali ne');
      assert.ok(r5);
      assert.equal(r5.customerName.toLowerCase(), 'ali');
      assert.equal(r5.amount, 500);
    });

    test('parses settlement patterns with word numbers', () => {
      const r = parseKhataSettleHeuristic('panch sau ali ne diye');
      assert.ok(r);
      assert.equal(r.customerName.toLowerCase(), 'ali');
      assert.equal(r.amount, 500);
    });

    test('parses settlement in Urdu script', () => {
      const r = parseKhataSettleHeuristic('علی نے 500 روپے دیے');
      assert.ok(r);
      assert.equal(r.customerName, 'علی');
      assert.equal(r.amount, 500);
    });

    test('parses khata balance inquiry patterns', () => {
      const q1 = parseKhataInquiryHeuristic('ali ka khata');
      assert.ok(q1);
      assert.equal(q1.customerName.toLowerCase(), 'ali');

      const q2 = parseKhataInquiryHeuristic('check khata usman');
      assert.ok(q2);
      assert.equal(q2.customerName.toLowerCase(), 'usman');

      const q3 = parseKhataInquiryHeuristic('علی کا کھاتہ');
      assert.ok(q3);
      assert.equal(q3.customerName, 'علی');
    });

    test('does NOT misclassify standard item sales as settlements', () => {
      assert.equal(parseKhataSettleHeuristic('2 doodh cash'), null);
      assert.equal(parseKhataSettleHeuristic('5 sugar cash'), null);
      assert.equal(parseKhataSettleHeuristic('3 panadol 150'), null);
    });
  });

  describe('findCustomerByFuzzyName with Honorific Stripping', () => {
    test('matches customer name when spoken with honorifics', async () => {
      const origFind = Customer.find;
      const origFindOne = Customer.findOne;
      Customer.findOne = async () => null; // Test list fallback
      Customer.find = () => ({
        limit: async () => [
          { _id: 'cust_1', name: 'rashid', balance: 1200 },
          { _id: 'cust_2', name: 'ali', balance: 800 },
          { _id: 'cust_3', name: 'usman', balance: 0 },
        ],
      });

      try {
        const c1 = await findCustomerByFuzzyName('merchant_123', 'rashid bhai');
        assert.ok(c1, 'Found rashid');
        assert.equal(c1._id, 'cust_1');

        const c2 = await findCustomerByFuzzyName('merchant_123', 'ali sahab');
        assert.ok(c2, 'Found ali');
        assert.equal(c2._id, 'cust_2');

        const c3 = await findCustomerByFuzzyName('merchant_123', 'haji usman sb');
        assert.ok(c3, 'Found usman');
        assert.equal(c3._id, 'cust_3');
      } finally {
        Customer.find = origFind;
        Customer.findOne = origFindOne;
      }
    });
  });

  describe('handleKhataSettle via Voice & Text', () => {
    test('deducts balance and sends spoken voice reply with voiceGender', async () => {
      let savedCustomer = null;
      const fakeCustomer = {
        _id: 'cust_1',
        name: 'rashid',
        balance: 1500,
        save: async function () {
          savedCustomer = this;
        },
      };

      const origFind = Customer.find;
      const origFindOne = Customer.findOne;
      const origPaymentCreate = KhataPayment.create;
      Customer.findOne = async () => fakeCustomer;
      Customer.find = () => ({
        limit: async () => [fakeCustomer],
      });
      KhataPayment.create = async (data) => data;

      let sentVoice = null;
      __setTestSender(
        async (recipient, opts) => {
          sentVoice = { recipient, ...opts };
          return { success: true };
        },
        async () => ({ success: true })
      );

      const fakeMerchant = {
        _id: 'merchant_123',
        whatsappNumber: '923001234567',
        language: 'ur',
        voiceGender: 'male',
        voiceReplies: true,
      };

      try {
        await handleKhataSettle(fakeMerchant, 'rashid bhai', 500, 'voice');

        // Verify balance deducted
        assert.equal(savedCustomer.balance, 1000);

        // Verify voice reply sent with merchant.voiceGender
        assert.ok(sentVoice, 'Voice reply was called');
        assert.equal(sentVoice.voiceGender, 'male');
        assert.ok(sentVoice.spokenText.includes('500 روپے جمع کر لیے گئے ہیں'));
        assert.ok(sentVoice.spokenText.includes('1000'));
      } finally {
        Customer.find = origFind;
        Customer.findOne = origFindOne;
        KhataPayment.create = origPaymentCreate;
        __setTestSender(null, null);
      }
    });
  });

  describe('handleVoiceGenderChange Flow', () => {
    test('updates merchant voiceGender to male and emits update', async () => {
      let savedMerchant = null;
      const fakeMerchant = {
        _id: 'm_123',
        whatsappNumber: '923001234567',
        language: 'ur',
        voiceGender: 'female',
        voiceReplies: true,
        save: async function () {
          savedMerchant = this;
        },
      };

      let sentReply = null;
      __setTestSender(
        async (recipient, opts) => {
          sentReply = { recipient, ...opts };
          return { success: true };
        },
        async () => ({ success: true })
      );

      try {
        await handleVoiceGenderChange(fakeMerchant, 'male', 'voice');
        assert.equal(fakeMerchant.voiceGender, 'male');
        assert.equal(savedMerchant.voiceGender, 'male');
        assert.ok(sentReply);
        assert.equal(sentReply.voiceGender, 'male');
      } finally {
        __setTestSender(null, null);
      }
    });

    test('toggles voiceGender between male and female', async () => {
      const fakeMerchant = {
        _id: 'm_123',
        whatsappNumber: '923001234567',
        language: 'ur',
        voiceGender: 'male',
        voiceReplies: true,
        save: async function () {},
      };

      __setTestSender(
        async () => ({ success: true }),
        async () => ({ success: true })
      );

      try {
        await handleVoiceGenderChange(fakeMerchant, 'toggle', 'voice');
        assert.equal(fakeMerchant.voiceGender, 'female');

        await handleVoiceGenderChange(fakeMerchant, 'toggle', 'voice');
        assert.equal(fakeMerchant.voiceGender, 'male');
      } finally {
        __setTestSender(null, null);
      }
    });
  });
});
