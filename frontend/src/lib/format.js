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
 * @returns {string} e.g. "2h ago", "Yesterday", "24 Aug"
 */
export function formatDate(dateInput) {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';

  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) return 'Just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 86400 * 7) return `${Math.floor(diffSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-PK', {
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
