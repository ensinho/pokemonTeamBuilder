import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || (process.env.VERCEL ? '/' : '/pokemonTeamBuilder/'),
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/')
          if (!normalizedId.includes('/node_modules/')) return undefined
          if (normalizedId.includes('/firebase/') || normalizedId.includes('/@firebase/')) return 'firebase'
          if (normalizedId.includes('/react/') || normalizedId.includes('/react-dom/') || normalizedId.includes('/scheduler/')) return 'react-vendor'
          return 'vendor'
        },
      },
    },
  },
})
