import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [react(),  tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://hrportal-server-7hkl.onrender.com',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'react';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})