import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts')) return 'recharts'
          if (id.includes('@tanstack/react-query')) return 'react-query'
          if (id.includes('react-router')) return 'react-router'
          if (id.includes('react-dom') || id.includes('/react/')) return 'react'
          if (id.includes('date-fns')) return 'date-fns'
          if (id.includes('axios')) return 'axios'
          if (id.includes('lucide-react')) return 'lucide'
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
