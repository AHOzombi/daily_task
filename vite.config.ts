import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 10123,
    allowedHosts: true,  // 允许所有主机
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:10124',
        changeOrigin: true
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 10123,
    allowedHosts: true,  // 允许所有主机
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:10124',
        changeOrigin: true
      }
    }
  }
});
