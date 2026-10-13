/**
 * Centralized Application Configuration
 * Single Source of Truth for API & WebSocket URLs.
 */
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'https://verbatask-api.mshiraz.com'
).replace(/\/+$/, '');

export const SOCKET_URL = API_BASE_URL;
