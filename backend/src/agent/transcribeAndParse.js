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

/**
 * Voice note -> transcript -> the same command-contract JSON the typed-text
 * path produces. Called from whatsapp.controller.js once media.service.js
 * has already downloaded the audio buffer.
 *
 * Deliberately does NOT romanize the transcript. Whisper transcribes spoken
 * Urdu into native Urdu (Perso-Arabic) script — Qwen-2.5 reads that natively,
 * so the native-script transcript goes straight into the same parseIntent()
 * the text path uses.
 */
export async function transcribeAndParse(buffer, mimeType) {
  if (buffer.length > MAX_AUDIO_BYTES) {
    return { type: 'unknown', rawText: '', error: 'audio_too_long' };
  }

  const transcript = await transcribeWithRetry(buffer, mimeType);

  if (!transcript?.trim()) {
    return { type: 'unknown', rawText: '' };
  }

  const intent = await parseIntent(transcript);
  return { ...intent, transcript };
}

async function transcribeWithRetry(buffer, mimeType, attempt = 1) {
  try {
    return await transcribe(buffer, mimeType);
  } catch (err) {
    const status = err.response?.status;
    // Retry once on transient failures (timeouts, rate limit, 5xx) — not on
    // 4xx auth/bad-request errors, retrying those just wastes another call.
    const transient = !status || status === 429 || status >= 500;
    if (transient && attempt < 2) {
      console.warn(`Transcription attempt ${attempt} failed, retrying once...`);
      return transcribeWithRetry(buffer, mimeType, attempt + 1);
    }
    throw err;
  }
}

async function transcribe(buffer, mimeType) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not set');
  }

  const form = new FormData();
  form.append('file', buffer, { filename: filenameFor(mimeType), contentType: mimeType });
  form.append('model', 'whisper-large-v3-turbo'); // fast + free-tier; swap to whisper-large-v3 if accuracy matters more than speed
  form.append('language', 'ur'); // hint improves accuracy; Groq still auto-detects reasonably if wrong

  const { data } = await axios.post(GROQ_TRANSCRIPTION_URL, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    timeout: 20_000,
    maxBodyLength: Infinity,
  });

  return data.text;
}

function filenameFor(mimeType) {
  if (mimeType?.includes('ogg')) return 'note.ogg';
  if (mimeType?.includes('mpeg') || mimeType?.includes('mp3')) return 'note.mp3';
  if (mimeType?.includes('mp4') || mimeType?.includes('m4a')) return 'note.m4a';
  if (mimeType?.includes('wav')) return 'note.wav';
  return 'note.bin';
}
