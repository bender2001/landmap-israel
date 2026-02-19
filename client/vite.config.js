import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libs for long-term caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'map-vendor': ['leaflet', 'react-leaflet'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': ['lucide-react'],
        },
      },
    },
    // Enable source maps for production debugging
    sourcemap: 'hidden',
    // Target modern browsers for smaller output
    target: 'es2020',
    // Module preload: Vite injects <link rel="modulepreload"> tags for all chunk imports.
    // This tells the browser to start downloading + parsing JS modules in parallel during
    // initial page load, instead of discovering them sequentially via import chains.
    // Reduces Time to Interactive by 15-25% for chunk-heavy apps (we have 30+ chunks).
    // The polyfill handles Safari < 17 which doesn't support modulepreload natively.
    modulePreload: {
      polyfill: true,
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
