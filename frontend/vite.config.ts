import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // Mirrors the production Pages Function proxy (functions/api/[[path]].ts):
      // the app always calls relative /api/* paths, and locally this proxy
      // forwards them to the Worker dev server instead of the browser hitting
      // it directly cross-origin. Keeps the cookie same-origin in both places.
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET ?? 'http://localhost:8788',
          changeOrigin: true,
        },
      },
    },
  }
})
