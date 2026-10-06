import FormData from 'form-data';
import axios from 'axios';
import { parseIntent } from '../services/qwen.service.js';

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
 */
export function buildVocabularyPrompt(merchant, catalog) {
  const businessName = catalog?.businessName || merchant?.businessName || '';
  const businessType = catalog?.businessType || merchant?.businessType || 'Retail';
  const commonTerms = 'cash, easypaisa, jazzcash, sadapay, nayapay, raast, meezan, hbl, ubl, bill, sale, total, rupay, rupees, روپے, kg, piece, packet, box, bottle, dozen';

  if (catalog?.names?.length) {
    const header = businessName ? `[${businessName} - ${businessType}]` : `[${businessType}]`;
    return `${header} Catalog: ${catalog.names.slice(0, 45).join(', ')}. Terms: ${commonTerms}`;
  }

  const header = businessName ? `[${businessName} - ${businessType}] ` : '';
  return `${header}Pakistani retail commerce & payment terms: ${commonTerms}`;
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
    console.warn('[voice] Empty transcription received');
    return { type: 'unknown', rawText: '' };
  }

  const detectedLanguage = /[\u0600-\u06FF]/.test(transcript) ? 'ur' : (language || 'ur');
  console.log(`[voice] transcript (${detectedLanguage}): "${transcript}"`);
  const intent = await parseIntent(transcript, merchant);
  return { ...intent, transcript, detectedLanguage };
}

async function transcribeWithRetry(buffer, cleanMimeType, language, prompt = '') {
  const primaryModel = language === 'ur' ? 'whisper-large-v3' : 'whisper-large-v3-turbo';
  const fallbackModel = language === 'ur' ? 'whisper-large-v3-turbo' : 'whisper-large-v3';

  try {
    return await transcribe(buffer, cleanMimeType, language, primaryModel, prompt);
  } catch (err1) {
    const status1 = err1.response?.status;
    console.warn(`[voice] ${primaryModel} (${language}) failed (${status1 || err1.message}). Retrying with auto-detect...`);

    try {
      return await transcribe(buffer, cleanMimeType, null, primaryModel, prompt);
    } catch (err2) {
      const status2 = err2.response?.status;
      console.warn(`[voice] ${primaryModel} (auto) failed (${status2 || err2.message}). Falling back to ${fallbackModel}...`);
      return await transcribe(buffer, cleanMimeType, language, fallbackModel, prompt);
    }
  }
}

/**
 * Raw Whisper transcription with dynamic vocabulary prompt.
 */
export async function transcribe(buffer, mimeType, language, model = 'whisper-large-v3-turbo', prompt = '') {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not set');
  }

  const cleanMime = (mimeType?.split(';')[0]?.trim() || 'audio/ogg').toLowerCase();
  const form = new FormData();
  form.append('file', buffer, { filename: filenameFor(cleanMime), contentType: cleanMime });
  form.append('model', model);
  if (language === 'en') {
    form.append('language', 'en');
  } else if (language === 'ur') {
    form.append('language', 'ur');
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

function filenameFor(mimeType) {
  const m = (mimeType || '').toLowerCase();
  if (m.includes('ogg') || m.includes('opus')) return 'note.ogg';
  if (m.includes('mpeg') || m.includes('mp3')) return 'note.mp3';
  if (m.includes('mp4') || m.includes('m4a')) return 'note.m4a';
  if (m.includes('wav')) return 'note.wav';
  return 'note.ogg';
}
