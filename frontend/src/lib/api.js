import { useAuthStore } from './store';
import { API_BASE_URL } from './config';

const BASE_URL = API_BASE_URL;

async function request(path, options = {}) {
  const token = useAuthStore.getState().token;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const primaryUrl = path.startsWith('http') ? path : `${BASE_URL}${cleanPath}`;

  // Fallback candidate if primary fails
  let fallbackUrl = null;
  if (!path.startsWith('http')) {
    if (BASE_URL.startsWith('http')) {
      fallbackUrl = cleanPath; // Same-origin via Netlify proxy
    } else {
      fallbackUrl = `https://verbatask-api.mshiraz.com${cleanPath}`;
    }
  }

  let response;
  try {
    response = await fetch(primaryUrl, config);
  } catch (primaryError) {
    if (fallbackUrl && fallbackUrl !== primaryUrl) {
      try {
        response = await fetch(fallbackUrl, config);
      } catch (fallbackError) {
        console.error(`[API] Both ${primaryUrl} and fallback ${fallbackUrl} failed:`, fallbackError);
        throw new Error('Network error. Please check your backend connection.', { cause: fallbackError });
      }
    } else {
      console.error(`[API] Fetch to ${primaryUrl} failed:`, primaryError);
      throw new Error('Network error. Please check your backend connection.', { cause: primaryError });
    }
  }

  let json;
  try {
    json = await response.json();
  } catch (err) {
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`, { cause: err });
    }
    return null;
  }


  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new Error(json?.error?.message || 'Session expired. Please log in again.');
  }

  if (!response.ok || json?.success === false) {
    const errorMsg = json?.error?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return json?.data;
}

export async function downloadFile(path, filename) {
  const token = useAuthStore.getState().token;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const primaryUrl = path.startsWith('http') ? path : `${BASE_URL}${cleanPath}`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  let fallbackUrl = null;
  if (!path.startsWith('http')) {
    if (BASE_URL.startsWith('http')) {
      fallbackUrl = cleanPath; // Same-origin via Netlify proxy
    } else {
      fallbackUrl = `https://verbatask-api.mshiraz.com${cleanPath}`;
    }
  }

  let res;
  try {
    res = await fetch(primaryUrl, { headers });
    if (!res.ok && res.status >= 500 && fallbackUrl && fallbackUrl !== primaryUrl) {
      res = await fetch(fallbackUrl, { headers });
    }
  } catch (err) {
    if (fallbackUrl && fallbackUrl !== primaryUrl) {
      try {
        res = await fetch(fallbackUrl, { headers });
      } catch (fallbackErr) {
        console.error(`[API] Download failed on both primary and fallback:`, fallbackErr);
        throw new Error('Network error. Failed to download file.', { cause: fallbackErr });
      }
    } else {
      console.error(`[API] Download failed:`, err);
      throw new Error('Network error. Failed to download file.', { cause: err });
    }
  }

  if (!res.ok) {
    let errText = `Download failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      errText = errJson?.error?.message || errText;
    } catch (_) {}
    throw new Error(errText);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename || 'Report.pdf';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
}

export const api = {
  get: (path, options) => request(path, { method: 'GET', ...options }),
  post: (path, body, options) => request(path, { method: 'POST', body, ...options }),
  put: (path, body, options) => request(path, { method: 'PUT', body, ...options }),
  patch: (path, body, options) => request(path, { method: 'PATCH', body, ...options }),
  del: (path, options) => request(path, { method: 'DELETE', ...options }),
  delete: (path, options) => request(path, { method: 'DELETE', ...options }),
  download: downloadFile,
};

