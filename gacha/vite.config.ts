import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { seoPlugin } from './vite-plugin-seo'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), seoPlugin()],
  server: {
    port: 3000
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        renderCapsules: path.resolve(__dirname, 'render-capsules.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  base: '/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
