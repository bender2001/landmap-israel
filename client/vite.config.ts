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
      // We force the correct MIME type on the CLIENT response (res), not
      // the upstream response (proxyRes), because proxyRes.headers mutation
      // doesn't always propagate through http-proxy for streaming responses.
      '/api/events': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        timeout: 0,
        headers: {
          'Accept': 'text/event-stream',
        },
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, _req, res) => {
            // Force text/event-stream on the CLIENT-facing response object.
            // This is the key fix — proxyRes.headers[] mutation doesn't work
            // reliably with http-proxy for chunked/streaming responses.
            if (res && 'setHeader' in res) {
              ;(res as any).setHeader('Content-Type', 'text/event-stream; charset=utf-8')
              ;(res as any).setHeader('Cache-Control', 'no-cache, no-transform')
              ;(res as any).setHeader('X-Accel-Buffering', 'no')
            }
            // Also set on proxyRes as a belt-and-suspenders approach
            proxyRes.headers['content-type'] = 'text/event-stream; charset=utf-8'
            proxyRes.headers['cache-control'] = 'no-cache, no-transform'
            proxyRes.headers['x-accel-buffering'] = 'no'
            // Delete any transfer-encoding that could interfere
            delete proxyRes.headers['transfer-encoding']
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
