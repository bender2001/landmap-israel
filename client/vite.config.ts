import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'map-vendor': ['leaflet', 'react-leaflet'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': ['lucide-react'],
        },
      },
    },
    sourcemap: 'hidden',
    target: 'es2020',
    modulePreload: { polyfill: true },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      // SSE endpoint — long-lived connection, no timeout, no buffering.
      // http-proxy can strip Content-Type from chunked/streaming responses.
      // We force the correct MIME type via proxyRes to prevent the browser
      // from seeing application/octet-stream and aborting EventSource.
      '/api/events': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        timeout: 0,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // Force text/event-stream — some http-proxy versions drop it
            proxyRes.headers['content-type'] = 'text/event-stream; charset=utf-8'
            proxyRes.headers['cache-control'] = 'no-cache, no-transform'
            proxyRes.headers['x-accel-buffering'] = 'no'
          })
          proxy.on('error', (_err, _req, res) => {
            if (res && 'writeHead' in res && !res.headersSent) {
              (res as any).writeHead(503, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
              })
              ;(res as any).end('data: {"type":"proxy_error"}\n\n')
            }
          })
        },
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && 'writeHead' in res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Backend unavailable', demo: true }))
            }
          })
        },
      },
    },
  },
})
