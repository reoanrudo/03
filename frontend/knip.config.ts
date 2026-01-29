import { defineConfig } from 'knip';

export default defineConfig({
  entry: ['index.html', 'vite.config.ts'],
  project: '.',
  ignore: [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**'
  ]
});
