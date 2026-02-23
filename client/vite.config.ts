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
      // SSE endpoint needs special handling — no timeout, no buffering
      '/api/events': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        timeout: 0,
        headers: { 'Accept': 'text/event-stream' },
        configure: (proxy) => {
          // Ensure SSE content-type is preserved through proxy
          proxy.on('proxyRes', (proxyRes: any) => {
            if (!proxyRes.headers['content-type']?.includes('text/event-stream')) {
              proxyRes.headers['content-type'] = 'text/event-stream'
            }
            proxyRes.headers['x-accel-buffering'] = 'no'
            proxyRes.headers['cache-control'] = 'no-cache, no-transform'
          })
          proxy.on('proxyReq', (_proxyReq: any, _req: any, res: any) => {
            // Prevent proxy from buffering SSE responses
            res?.flushHeaders?.()
          })
          proxy.on('error', (_err: any, _req: any, res: any) => {
            if (res && 'writeHead' in res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' })
              res.end('data: {"type":"proxy_error"}\n\n')
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
