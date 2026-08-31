import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom root domain (hksplit.no) → base '/'
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
})
