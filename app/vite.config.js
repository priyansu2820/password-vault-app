import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // CRITICAL: Ensures correct relative paths for assets in packaged Electron app
  build: {
    outDir: 'dist', // Standard output directory for Vite builds
  },
})