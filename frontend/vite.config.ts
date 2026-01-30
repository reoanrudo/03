import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  plugins: [react()],
  // セキュリティ: APIキー等の機密情報をクライアント側に露出させない
  // define: {
  //   'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  //   'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
  // },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  optimizeDeps: {
    include: ['@tensorflow/tfjs', '@tensorflow-models/handpose', 'tone']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
});
