import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['src/**', 'jsdom'],
    ],
    setupFiles: ['./src/test-setup.js'],
  },
})
