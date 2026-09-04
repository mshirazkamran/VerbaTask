import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifestFilename: 'site.webmanifest',
      includeAssets: [
        'favicon_io-dark/**/*',
        'favicon_io-light/**/*',
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
      ],
      manifest: {
        name: 'VerbaTask',
        short_name: 'VerbaTask',
        description: 'WhatsApp-first sales, stock, approvals, and workflow dashboard for merchants.',
        id: '/',
        start_url: '/',
        scope: '/',
        lang: 'en',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'browser'],
        orientation: 'portrait-primary',
        theme_color: '#10B981',
        background_color: '#0B0D11',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: '/favicon_io-dark/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/favicon_io-dark/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})

