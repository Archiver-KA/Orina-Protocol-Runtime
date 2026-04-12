import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('wagmi') || id.includes('/viem/') || id.includes('@tanstack/react-query')) return 'vendor-web3'
          if (id.includes('maplibre-gl') || id.includes('react-map-gl')) return 'vendor-maps'
          if (id.includes('recharts')) return 'vendor-charts'
          if (
            id.includes('react-dom') ||
            id.includes(`${path.sep}react${path.sep}`) ||
            id.includes('/react/')
          ) {
            return 'vendor-react'
          }
          if (
            id.includes('@mui/') ||
            id.includes('@emotion/') ||
            id.includes('@radix-ui/') ||
            id.includes('lucide-react') ||
            id.includes('/motion/') ||
            id.includes('motion/react') ||
            id.includes('sonner') ||
            id.includes('react-day-picker') ||
            id.includes('react-hook-form') ||
            id.includes('cmdk') ||
            id.includes('react-resizable-panels') ||
            id.includes('embla-carousel-react') ||
            id.includes('react-medium-image-zoom') ||
            id.includes('react-responsive-masonry') ||
            id.includes('react-slick') ||
            id.includes('react-zoom-pan-pinch') ||
            id.includes('next-themes') ||
            id.includes('@popperjs/core')
          ) {
            return 'vendor-ui'
          }
        },
      },
    },
  },
  test: {
    exclude: [
      '**/.clean-room/**',
      '**/dist/**',
      '**/node_modules/**',
    ],
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
