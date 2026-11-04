import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Ingestion handler plugin to safely intercept PostHog telemetry without proxy failures
function posthogIngestPlugin() {
  const handler = (req: any, res: any, next: any) => {
    const url = req.url || '';
    if (url.startsWith('/ingest')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (url.includes('/decide')) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({ featureFlags: {}, sessionRecording: false }));
        return;
      }

      // Handle /e/, /batch/, /capture/, /s/ endpoints
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({ status: 1 }));
      return;
    }
    next();
  };

  return {
    name: 'posthog-ingest-handler',
    configureServer(server: any) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(handler);
    },
  };
}

// Vayyari Store Prelaunch SPA
// Port 8085 allocated in accordance with DeepLens store port series (8081 Metro, 8082 Store Web, 8085 Prelaunch SPA)
export default defineConfig({
  plugins: [react(), posthogIngestPlugin()],
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
    },
  },
});

