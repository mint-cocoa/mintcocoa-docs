import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://ops-api.mintcocoa.cc',
        changeOrigin: true,
        secure: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: '../docs/devops',
    emptyOutDir: false, // Do not delete other portfolio files
    rollupOptions: {
      input: {
        OpsDashboard: 'OpsDashboard.html',
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    }
  },
  base: './'
})
