import { create } from 'zustand';

const TOKEN_KEY = 'boldukan_token';
const LEGACY_TOKEN_KEY = 'verbatask_token';
const MERCHANT_ID_KEY = 'boldukan_merchant_id';
const LEGACY_MERCHANT_ID_KEY = 'verbatask_merchant_id';
const THEME_KEY = 'boldukan_theme';
const LEGACY_THEME_KEY = 'verbatask_theme';
const COOKIE_TOKEN_KEY = 'boldukan_session';
const LEGACY_COOKIE_TOKEN_KEY = 'vt_session';
const COOKIE_MERCHANT_KEY = 'boldukan_merchant_id';
const LEGACY_COOKIE_MERCHANT_KEY = 'vt_merchant_id';
const LANG_KEY = 'boldukan_language';
const LEGACY_LANG_KEY = 'verbatask_language';

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name, value, days = 7) {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

function removeCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
}

function getInitialToken() {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem(TOKEN_KEY) ||
    getCookie(COOKIE_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_TOKEN_KEY) ||
    getCookie(LEGACY_COOKIE_TOKEN_KEY) ||
    getCookie(TOKEN_KEY) ||
    getCookie(LEGACY_TOKEN_KEY) ||
    null
  );
}

function getInitialMerchantId() {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem(MERCHANT_ID_KEY) ||
    getCookie(COOKIE_MERCHANT_KEY) ||
    localStorage.getItem(LEGACY_MERCHANT_ID_KEY) ||
    getCookie(LEGACY_COOKIE_MERCHANT_KEY) ||
    getCookie(MERCHANT_ID_KEY) ||
    getCookie(LEGACY_MERCHANT_ID_KEY) ||
    null
  );
}

export const useAuthStore = create((set) => ({
  token: getInitialToken(),
  merchantId: getInitialMerchantId(),
  merchant: null,

  setAuth: (token, merchantId) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      setCookie(COOKIE_TOKEN_KEY, token, 7);
      setCookie(TOKEN_KEY, token, 7);
      // Also sync legacy for smooth transition
      localStorage.setItem(LEGACY_TOKEN_KEY, token);
      setCookie(LEGACY_COOKIE_TOKEN_KEY, token, 7);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      removeCookie(COOKIE_TOKEN_KEY);
      removeCookie(TOKEN_KEY);
      removeCookie(LEGACY_COOKIE_TOKEN_KEY);
      removeCookie(LEGACY_TOKEN_KEY);
    }

    if (merchantId) {
      localStorage.setItem(MERCHANT_ID_KEY, merchantId);
      setCookie(COOKIE_MERCHANT_KEY, merchantId, 7);
      setCookie(MERCHANT_ID_KEY, merchantId, 7);
      localStorage.setItem(LEGACY_MERCHANT_ID_KEY, merchantId);
      setCookie(LEGACY_COOKIE_MERCHANT_KEY, merchantId, 7);
    } else {
      localStorage.removeItem(MERCHANT_ID_KEY);
      localStorage.removeItem(LEGACY_MERCHANT_ID_KEY);
      removeCookie(COOKIE_MERCHANT_KEY);
      removeCookie(MERCHANT_ID_KEY);
      removeCookie(LEGACY_COOKIE_MERCHANT_KEY);
      removeCookie(LEGACY_MERCHANT_ID_KEY);
    }

    set({ token, merchantId });
  },

  setMerchant: (merchant) => set({ merchant }),

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(MERCHANT_ID_KEY);
    localStorage.removeItem(LEGACY_MERCHANT_ID_KEY);
    removeCookie(COOKIE_TOKEN_KEY);
    removeCookie(LEGACY_COOKIE_TOKEN_KEY);
    removeCookie(TOKEN_KEY);
    removeCookie(LEGACY_TOKEN_KEY);
    removeCookie(COOKIE_MERCHANT_KEY);
    removeCookie(LEGACY_COOKIE_MERCHANT_KEY);
    removeCookie(MERCHANT_ID_KEY);
    removeCookie(LEGACY_MERCHANT_ID_KEY);
    set({ token: null, merchantId: null, merchant: null });
    // Fire-and-forget server cookie clear
    try {
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    } catch (_) {}
  },
}));

function updateDynamicFavicon(isDark) {
  if (typeof document === 'undefined') return;
  const folder = isDark ? '/favicon_io-dark' : '/favicon_io-light';

  // Update primary favicon target
  let dynamicLink = document.getElementById('dynamic-favicon');
  if (!dynamicLink) {
    dynamicLink = document.createElement('link');
    dynamicLink.id = 'dynamic-favicon';
    dynamicLink.rel = 'icon';
    document.head.appendChild(dynamicLink);
  }
  dynamicLink.href = `${folder}/favicon-32x32.png`;

  // Update mobile web app theme color meta
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.content = isDark ? '#0C1A1C' : '#F8F5EC';
  }
}

function applyTheme(theme) {
  if (typeof window === 'undefined') return;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  updateDynamicFavicon(isDark);
}

// React if user is using system preference and OS toggles between dark/light
if (typeof window !== 'undefined' && window.matchMedia) {
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const current = localStorage.getItem(THEME_KEY) || 'system';
      if (current === 'system') {
        applyTheme('system');
      }
    });
  } catch {
    // Safari fallback
  }
}

// Clean up any stale legacy landing theme key to avoid desync
if (typeof localStorage !== 'undefined') {
  localStorage.removeItem('verbatask_landing_theme');
}

const initialTheme =
  typeof localStorage !== 'undefined'
    ? localStorage.getItem(THEME_KEY) || localStorage.getItem(LEGACY_THEME_KEY) || 'system'
    : 'dark';
applyTheme(initialTheme);

const initialLang =
  typeof localStorage !== 'undefined'
    ? localStorage.getItem(LANG_KEY) || localStorage.getItem(LEGACY_LANG_KEY) || 'en'
    : 'en';

export const useUiStore = create((set) => ({
  sidebarCollapsed: false,
  theme: initialTheme,
  language: initialLang,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },

  setLanguage: (language) => {
    localStorage.setItem(LANG_KEY, language);
    set({ language });
  },

  toggleLanguage: () =>
    set((state) => {
      const next = state.language === 'ur' ? 'en' : 'ur';
      localStorage.setItem(LANG_KEY, next);
      return { language: next };
    }),
}));
