import { defineConfig } from 'vite';

export default defineConfig({
  root: './src',
  build: {
    outDir: './dist',
    emptyOutDir: true
  },
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
  optimizeDeps: {
    force: true,
  },
});
