import { create } from 'zustand';

const TOKEN_KEY = 'verbatask_token';
const MERCHANT_ID_KEY = 'verbatask_merchant_id';
const THEME_KEY = 'verbatask_theme';

export const useAuthStore = create((set) => ({
  token: localStorage.getItem(TOKEN_KEY) || null,
  merchantId: localStorage.getItem(MERCHANT_ID_KEY) || null,
  merchant: null,

  setAuth: (token, merchantId) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);

    if (merchantId) localStorage.setItem(MERCHANT_ID_KEY, merchantId);
    else localStorage.removeItem(MERCHANT_ID_KEY);

    set({ token, merchantId });
  },

  setMerchant: (merchant) => set({ merchant }),

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(MERCHANT_ID_KEY);
    set({ token: null, merchantId: null, merchant: null });
  },
}));

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
}

// Clean up any stale legacy landing theme key to avoid desync
if (typeof localStorage !== 'undefined') {
  localStorage.removeItem('verbatask_landing_theme');
}

const initialTheme = typeof localStorage !== 'undefined' ? (localStorage.getItem(THEME_KEY) || 'dark') : 'dark';
applyTheme(initialTheme);

export const useUiStore = create((set) => ({
  sidebarCollapsed: false,
  theme: initialTheme,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },
}));
