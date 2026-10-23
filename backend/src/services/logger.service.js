/**
 * Structured logger — one JSON object per line, so pm2 logs can be grepped or shipped to a log
 * store as-is (e.g. `pm2 logs verbatask | grep '"event":"llm.call"'`). No dependency.
 *
 * LOG_LEVEL=debug|info|warn|error (default info) controls what is printed.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold() {
  return LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] ?? LEVELS.info;
}

function write(level, event, fields = {}) {
  if (LEVELS[level] < threshold()) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event, fields) => write('debug', event, fields),
  info: (event, fields) => write('info', event, fields),
  warn: (event, fields) => write('warn', event, fields),
  error: (event, fields) => write('error', event, fields),
};

/** Short, log-safe description of an axios/other error (never the request config, which can hold API keys). */
export function errorSummary(err) {
  const status = err?.response?.status;
  const apiMessage = err?.response?.data?.error?.message;
  return [status ? `HTTP ${status}` : null, apiMessage || err?.message || String(err)].filter(Boolean).join(': ').slice(0, 300);
}
