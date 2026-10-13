/**
 * Centralized Application Configuration
 * Single Source of Truth for API & WebSocket URLs.
 */
const rawEnvUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  '';

// Discard stale or decommissioned endpoints (e.g. Railway or Fly.io) if left in host environment
const isObsolete =
  rawEnvUrl.includes('railway.app') ||
  rawEnvUrl.includes('fly.dev') ||
  !rawEnvUrl.startsWith('http');

export const API_BASE_URL = (
  (!rawEnvUrl || isObsolete)
    ? 'https://verbatask-api.mshiraz.com'
    : rawEnvUrl
).replace(/\/+$/, '');

export const SOCKET_URL = API_BASE_URL;
