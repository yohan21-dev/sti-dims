import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy /api calls to PHP backend during development
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
      },
    },
  },
  build: {
    outDir: '../backend/public',  // serves from PHP's public root
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
})