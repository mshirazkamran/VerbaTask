/**
 * Formats a number to Pakistani Rupee currency string with tabular-friendly representation.
 * @param {number} amount
 * @returns {string} e.g. "Rs. 1,500"
 */
export function formatPKR(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return 'Rs. 0';
  return `Rs. ${new Intl.NumberFormat('en-PK', {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

/**
 * Formats ISO date or timestamp to relative or compact readable string.
 * @param {string | Date} dateInput
 * @param {string} [language='en']
 * @returns {string} e.g. "2h ago", "Yesterday", "24 Aug" or "2 گھنٹے پہلے"
 */
export function formatDate(dateInput, language = 'en') {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';

  const isUrdu = language === 'ur';
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) return isUrdu ? 'ابھی' : 'Just now';
  if (diffSeconds < 3600) {
    const mins = Math.floor(diffSeconds / 60);
    return isUrdu ? `${mins} منٹ پہلے` : `${mins}m ago`;
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return isUrdu ? `${hours} گھنٹے پہلے` : `${hours}h ago`;
  }
  if (diffSeconds < 86400 * 7) {
    const days = Math.floor(diffSeconds / 86400);
    return isUrdu ? `${days} دن پہلے` : `${days}d ago`;
  }

  return date.toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Formats quantity with optional unit label.
 * Avoids ambiguous number collisions (e.g. "18 250g" -> "18 × 250g").
 * @param {number} qty
 * @param {string} [unit]
 * @returns {string} e.g. "15 kg", "18 × 250g", "20 packs"
 */
export function formatQuantity(qty, unit) {
  const q = typeof qty === 'number' ? qty : Number(qty) || 0;
  if (!unit || !unit.trim()) return `${q}`;

  const u = unit.trim();

  // If unit contains digits (e.g. "250g", "250gram stick", "500ml", "1.5L"),
  // it specifies a package size. Use "×" to clearly denote count × pack size.
  if (/\d/.test(u)) {
    return `${q} × ${u}`;
  }

  // Handle pluralization for standard count units
  const countUnits = ['pack', 'packet', 'box', 'bottle', 'can', 'bag', 'carton', 'piece', 'item', 'unit', 'stick', 'sachet'];
  const lower = u.toLowerCase();
  if (countUnits.includes(lower)) {
    if (q === 1) return `1 ${u}`;
    if (lower === 'box') return `${q} boxes`;
    return `${q} ${u}s`;
  }

  // Loose weight or liquid measures (kg, litre, g, dozen, etc.)
  return `${q} ${u}`;
}

/**
 * Normalizes phone numbers to Pakistani standard 12-digit format (923XXXXXXXXX).
 * @param {string} str
 * @returns {string} e.g. "923053331098"
 */
export function normalizePhone(str) {
  if (!str) return '';
  const digits = String(str).replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 11) return '92' + digits.slice(1);
  if (digits.length === 10 && digits.startsWith('3')) return '92' + digits;
  return digits;
}

/**
 * Formats a phone number cleanly for UI display (+92 305 3331098).
 * Avoids duplicate + or "+0305..." artifacts.
 * @param {string} phone
 * @returns {string} e.g. "+92 305 3331098"
 */
export function formatPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length === 12) {
    return `+92 ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `+92 ${digits.slice(1, 4)} ${digits.slice(4)}`;
  }
  if (digits.length === 10 && digits.startsWith('3')) {
    return `+92 ${digits.slice(0, 3)} ${digits.slice(3)}`;
  }
  return String(phone).startsWith('+') ? phone : `+${phone}`;
}

/**
 * Cleans store name by stripping location, business category/type, and punctuation.
 * e.g. "Al sheikh general store, Rawalpindi, Kiryana General store." -> "Al sheikh general store"
 * @param {string} name
 * @param {string} [location]
 * @returns {string}
 */
export function formatBusinessName(name, location) {
  if (!name || typeof name !== 'string') return '';
  let clean = name.trim();

  // If there are commas, take only the primary store name (first segment)
  if (clean.includes(',')) {
    clean = clean.split(',')[0].trim();
  }

  // If there are dashes or pipes separating city/type (e.g. "Store - City")
  if (clean.includes(' - ')) {
    clean = clean.split(' - ')[0].trim();
  } else if (clean.includes(' | ')) {
    clean = clean.split(' | ')[0].trim();
  }

  // Strip trailing punctuation like periods or commas
  clean = clean.replace(/[.,\s]+$/, '');

  // If location was explicitly passed and is attached to the name, strip it
  if (location && typeof location === 'string' && location.trim()) {
    const locRegex = new RegExp(`\\s*[-–,|]?\\s*${location.trim()}\\b.*$`, 'i');
    clean = clean.replace(locRegex, '').trim();
  }

  return clean.replace(/[.,\s]+$/, '') || name;
}

