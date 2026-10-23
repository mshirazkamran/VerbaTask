/**
 * Whisper often writes spoken Urdu in Hindi (Devanagari) script — the same words, different
 * letters: "अली ने 400 रुपये वापस कर दिए". Nothing downstream reads Devanagari, so convert it to
 * the Roman Urdu the parsers understand: "ali ne 400 rupaye wapas kar die".
 */

const INDEPENDENT_VOWELS = {
  'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u', 'ए': 'e', 'ऐ': 'ai',
  'ओ': 'o', 'औ': 'au', 'ऑ': 'o', 'ऋ': 'ri',
};

const CONSONANTS = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'f', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'w',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l',
  'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'फ़': 'f', 'ड़': 'r', 'ढ़': 'rh', 'य़': 'y',
};

const VOWEL_SIGNS = {
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॉ': 'o', 'ृ': 'ri',
};

const NUKTA = '़';
const VIRAMA = '्';
const NASALS = { 'ं': 'n', 'ँ': 'n' };
const DIGITS = { '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9' };

export function hasDevanagari(text) {
  return /[ऀ-ॿ]/.test(String(text || ''));
}

/** Devanagari -> Roman Urdu, keeping everything else (digits, Latin, punctuation) as is. */
export function devanagariToRoman(text) {
  const chars = [...String(text || '').normalize('NFC')];
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    let ch = chars[i];
    // Consonant + nukta written as two code points ("ज" + "़" -> "ज़")
    if (chars[i + 1] === NUKTA && CONSONANTS[ch + NUKTA]) {
      ch += NUKTA;
      i++;
    }

    if (CONSONANTS[ch]) {
      out += CONSONANTS[ch];
      const next = chars[i + 1];
      if (VOWEL_SIGNS[next]) {
        out += VOWEL_SIGNS[next];
        i++;
      } else if (next === VIRAMA) {
        i++;
      } else if (next && /[ऀ-ॿ]/.test(next) && !NASALS[next]) {
        out += 'a'; // inherent vowel inside a word; dropped at the word's end ("वापस" -> "wapas")
      } else if (NASALS[next]) {
        out += 'a';
      }
    } else if (INDEPENDENT_VOWELS[ch]) {
      out += INDEPENDENT_VOWELS[ch];
    } else if (NASALS[ch]) {
      out += NASALS[ch];
    } else if (ch === 'ः') {
      out += 'h';
    } else if (DIGITS[ch]) {
      out += DIGITS[ch];
    } else if (ch === '।' || ch === '॥') {
      out += '.';
    } else if (ch === NUKTA || ch === VIRAMA || VOWEL_SIGNS[ch]) {
      // stray combining mark: skip
    } else {
      out += ch;
    }
  }
  return out;
}
