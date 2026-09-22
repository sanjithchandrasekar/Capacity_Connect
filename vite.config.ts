import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": `${import.meta.dirname}/src`,
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/framer-motion/') || id.includes('node_modules/gsap/')) {
            return 'vendor-motion'
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons'
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase'
          }
          if (id.includes('node_modules/recharts/')) {
            return 'vendor-charts'
          }
          if (id.includes('node_modules/@tanstack/') || id.includes('node_modules/sonner/') || id.includes('node_modules/date-fns/')) {
            return 'vendor-misc'
          }
        },
      },
    },
  },
})

