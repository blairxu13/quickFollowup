import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
    base: './', // same
    plugins: [], // no react plugin
    build: {
      emptyOutDir: false, // so it doesn’t wipe popup/background output
      outDir: 'dist',
      rollupOptions: {
        input: resolve(__dirname, 'popup/src/content/infra/messaging.ts'),
        output: {
          format: 'iife', // ✅ key difference
          name: 'content',
          entryFileNames: 'assets/content.js',
          inlineDynamicImports: true, // ensures all deps bundled in
        },
      },
    },
  })
  