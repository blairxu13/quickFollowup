import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  plugins: [react()],
  publicDir: 'popup/public',

  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup/index.html'),
        background: resolve(__dirname, 'popup/src/background/infra/Messaging.ts'),
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
  }
})
