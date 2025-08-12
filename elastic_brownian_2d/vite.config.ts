import { defineConfig } from 'vite';

export default defineConfig({
  root: './src',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 5124,
    strictPort: true,
    hmr: true,
    headers: {
      'Cache-Control': 'no-store'
    }
  },
  optimizeDeps: {
    force: true
  }
});
