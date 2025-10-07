/// <reference types="node" />
/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appName = env.VITE_APP_NAME || 'PraisePoint E Commerce';
  const shortName = (appName.length > 12 ? appName.slice(0, 12) : appName);
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        devOptions: { enabled: true },
        manifest: {
          name: appName,
          short_name: shortName,
          start_url: '/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#0ea5e9',
          icons: [
            { src: '/icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
            { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
          ]
        }
      })
    ],
    server: {
      port: 5173,
      strictPort: true
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      globals: true,
      css: true
    }
  }
});
