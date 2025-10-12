import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup/index.html'),
        background: resolve(__dirname, 'src/background/infra/Messaging.ts'),
        background: resolve(__dirname, 'src/content/infra/messaging.ts'),
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
  }
})
