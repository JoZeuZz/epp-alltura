/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslintPlugin from 'vite-plugin-eslint';
import checker from 'vite-plugin-checker';
import path from 'path';
import svgr from 'vite-plugin-svgr';

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  plugins: [
    react(),
    // Only run eslint and type checker in development
    ...(isDev
      ? [
          eslintPlugin({
            failOnError: false,
          }),
          checker({ typescript: true }),
        ]
      : []),
    svgr(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // URL del backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
    exclude: ['tests/smoke/**', '**/node_modules/**', '**/dist/**'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep all third-party deps in one chunk to avoid circular chunk deps
          // that can initialize React imports out of order in production.
          if (id.includes('node_modules')) return 'vendor';
          return undefined;
        },
      },
    },
  },
});
