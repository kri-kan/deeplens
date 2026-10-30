import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vayyari Store Prelaunch SPA
// Port 8085 allocated in accordance with DeepLens store port series (8081 Metro, 8082 Store Web, 8085 Prelaunch SPA)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8085,
    host: true,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5200',
        changeOrigin: true,
      },
      '/ingest': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ingest/, ''),
      },
    },
  },
  preview: {
    port: 8085,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5200',
        changeOrigin: true,
      },
      '/ingest': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ingest/, ''),
      },
    },
  },
});
