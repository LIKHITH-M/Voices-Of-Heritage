import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api/ai': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/trips': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/maps': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/depkg': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/research': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
      '/api/bookings': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/stays': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/guides': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/food': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/wellness': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/tickets': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/utilities': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/experiences': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
    },
  },
});
