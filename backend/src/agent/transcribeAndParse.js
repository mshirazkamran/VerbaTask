import FormData from 'form-data';
import axios from 'axios';
import { parseIntent } from '../services/qwen.service.js';
import { logger, errorSummary } from '../services/logger.service.js';

// Groq runs OpenAI-compatible Whisper endpoints for free (2,000 req/day on
// the free tier, no credit card) — get a key at console.groq.com. This is
// NOT OpenAI's own Whisper API, which is paid (~$0.36/hour of audio).
const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

// WhatsApp technically allows voice notes up to several minutes long.
// Whisper handles that fine, but a merchant fumble-recording a 5-minute note
// costs you rate-limit budget and latency for no reason — cap it.
const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // ~8MB, comfortably covers a normal 1-2 min voice note

import { getMerchantCatalog } from '../services/catalogCache.service.js';

/**
 * Builds dynamic transcription vocabulary prompt tailored to the merchant's real catalog.
 * Uses natural continuous text with sales, restock, and payment keywords in English, Roman Urdu, and Urdu script.
 */
export function buildVocabularyPrompt(merchant, catalog) {
  const businessName = catalog?.businessName || merchant?.businessName || '';
  const businessType = catalog?.businessType || merchant?.businessType || 'Retail';
  const commonTerms = 'cash, easypaisa, jazzcash, sadapay, nayapay, raast, meezan, hbl, ubl, bill, sale, total, rupay, rupees, روپے, kg, piece, packet, box, bottle, dozen, add stock, restock, inventory, maal aya, naya maal, ایڈ اسٹاک';

  if (catalog?.names?.length) {
    const header = businessName ? `[${businessName} - ${businessType}]` : `[${businessType}]`;
    return `${header} Catalog: ${catalog.names.slice(0, 45).join(', ')}. Terms: ${commonTerms}. Context: 2 kg chawal 300 cash, add stock 50 rice, maal aya 20 chini 150, ali ne 500 diye, udhaar, دو کلو چینی کیش، مال آیا`;
  }

  const header = businessName ? `[${businessName} - ${businessType}] ` : '';
  return `${header}Pakistani retail commerce & payment terms: ${commonTerms}. Context: 2 kg chawal 300 cash, add stock 50 rice, maal aya 20 chini 150, ali ne 500 diye, udhaar, دو کلو چینی کیش، مال آیا`;
}

/**
 * Voice note -> transcript -> structured command.
 * Dynamically adapts Whisper vocabulary to the merchant's inventory catalog.
 *
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {string} [language='ur'] merchant language ('en' or 'ur')
 * @param {Object} [merchant=null] merchant document
 */
export async function transcribeAndParse(buffer, mimeType, language = 'ur', merchant = null) {
  if (!buffer || !buffer.length) {
    return { type: 'unknown', rawText: '', error: 'empty_audio' };
  }

  if (buffer.length > MAX_AUDIO_BYTES) {
    return { type: 'unknown', rawText: '', error: 'audio_too_long' };
  }

  const cleanMimeType = (mimeType?.split(';')[0]?.trim() || 'audio/ogg').toLowerCase();
  const catalog = merchant?._id ? await getMerchantCatalog(merchant._id) : null;
  const prompt = buildVocabularyPrompt(merchant, catalog);

  const transcript = await transcribeWithRetry(buffer, cleanMimeType, language, prompt);

  if (!transcript?.trim()) {
    logger.warn('stt.empty_transcript', { audioBytes: buffer.length });
    return { type: 'unknown', rawText: '' };
  }

  const detectedLanguage = /[\u0600-\u06FF]/.test(transcript) ? 'ur' : (language || 'ur');
  logger.info('stt.transcript', { language: detectedLanguage, transcript });
  const intent = await parseIntent(transcript, merchant);
  return { ...intent, transcript, detectedLanguage };
}

const GEMINI_STT_MODEL = 'gemini-3.8-flash';

/**
 * Groq whisper-large-v3 -> Groq whisper-large-v3-turbo -> Gemini. Every attempt logs an
 * stt.call event with the provider and model, so the logs show which one produced the transcript.
 */
async function transcribeWithRetry(buffer, cleanMimeType, language, prompt = '') {
  const attempts = [
    { provider: 'groq', model: 'whisper-large-v3', run: () => transcribe(buffer, cleanMimeType, language, 'whisper-large-v3', prompt) },
    { provider: 'groq', model: 'whisper-large-v3-turbo', run: () => transcribe(buffer, cleanMimeType, language, 'whisper-large-v3-turbo', prompt) },
    ...(process.env.GEMINI_API_KEY
      ? [{ provider: 'gemini', model: GEMINI_STT_MODEL, run: () => transcribeWithGemini(buffer, cleanMimeType, prompt) }]
      : []),
  ];

  let groqError = null;
  for (const { provider, model, run } of attempts) {
    const startedAt = Date.now();
    try {
      const text = await run();
      logger.info('stt.call', { provider, model, outcome: 'success', latencyMs: Date.now() - startedAt, audioBytes: buffer.length, mimeType: cleanMimeType, transcriptChars: text?.length ?? 0 });
      return text;
    } catch (err) {
      if (provider === 'groq') groqError = err;
      logger.warn('stt.call', { provider, model, outcome: 'error', latencyMs: Date.now() - startedAt, audioBytes: buffer.length, mimeType: cleanMimeType, error: errorSummary(err) });
    }
  }
  // Surface the Groq error (as before): it is the one that explains a misconfigured key.
  throw groqError;
}

/**
 * Raw Whisper transcription with dynamic vocabulary prompt.
 */
export async function transcribe(buffer, mimeType, language, model = 'whisper-large-v3', prompt = '') {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not set');
  }

  const cleanMime = (mimeType?.split(';')[0]?.trim() || 'audio/ogg').toLowerCase();
  const form = new FormData();
  form.append('file', buffer, { filename: filenameFor(cleanMime), contentType: cleanMime });
  form.append('model', model);
  if (language === 'en') {
    form.append('language', 'en');
  }
  if (prompt) {
    form.append('prompt', prompt);
  }

  const { data } = await axios.post(GROQ_TRANSCRIPTION_URL, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    timeout: 15_000,
    maxBodyLength: Infinity,
  });

  return data.text;
}

/**
 * Gemini multimodal audio transcription fallback.
 */
async function transcribeWithGemini(buffer, mimeType, prompt = '') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_STT_MODEL}:generateContent`,
    {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Transcribe this retail store audio voice note accurately. Return ONLY the transcription text, nothing else. If it contains Urdu, English, or Roman Urdu, preserve the words as spoken.\n${prompt ? `Context: ${prompt}` : ''}`,
            },
            {
              inlineData: {
                mimeType: mimeType || 'audio/ogg',
                data: buffer.toString('base64'),
              },
            },
          ],
        },
      ],
    },
    // Key in a header, not the URL: axios errors carry the URL, and errors get logged.
    { headers: { 'x-goog-api-key': apiKey }, timeout: 20_000 }
  );

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  return text;
}

function filenameFor(mimeType) {
  const m = (mimeType || '').toLowerCase();
  if (m.includes('ogg') || m.includes('opus')) return 'note.ogg';
  if (m.includes('mpeg') || m.includes('mp3')) return 'note.mp3';
  if (m.includes('mp4') || m.includes('m4a')) return 'note.m4a';
  if (m.includes('wav')) return 'note.wav';
  return 'note.ogg';
}
