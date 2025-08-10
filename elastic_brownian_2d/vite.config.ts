import { defineConfig } from 'vite';

export default defineConfig({
  root: './src',
  server: {
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3001,
    },
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  build: {
    outDir: './dist',
  },
  optimizeDeps: {
    force: true,
  },
});
