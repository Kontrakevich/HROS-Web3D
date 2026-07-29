import { defineConfig } from 'vite';

export default defineConfig({
  base: '/HROS-Web3D/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
});
