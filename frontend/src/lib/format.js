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
 * @param {number} qty
 * @param {string} [unit]
 * @returns {string} e.g. "15 kg", "20 bags"
 */
export function formatQuantity(qty, unit) {
  const q = typeof qty === 'number' ? qty : 0;
  if (!unit) return `${q}`;
  return `${q} ${unit}`;
}
