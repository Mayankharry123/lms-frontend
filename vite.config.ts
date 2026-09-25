import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

function parseProxyUrl(rawUrl: string, fallbackUrl: string): { target: string; basePath: string } {
  const value = String(rawUrl || '').trim() || fallbackUrl

  try {
    const url = new URL(value)
    const basePath = url.pathname.replace(/\/+$/, '') || ''

    return {
      target: `${url.protocol}//${url.host}`,
      basePath,
    }
  } catch {
    const fallback = new URL(fallbackUrl)
    const basePath = fallback.pathname.replace(/\/+$/, '') || ''

    return {
      target: `${fallback.protocol}//${fallback.host}`,
      basePath,
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = String(env.VITE_API_BASE_URL || 'https://www.api.dev.lms.dgtoohl.com/api/v1').trim()
  const sspApiBaseUrl = String(env.VITE_SSP_API_BASE_URL || 'https://www.staging.dgtoohl.com/api').trim()
  const remoteImagesBaseUrl = String(env.VITE_REMOTE_IMAGES_BASE_URL || 'https://d2nljoxssb7y4b.cloudfront.net').trim()

  const apiProxy = parseProxyUrl(apiBaseUrl, 'https://www.api.dev.lms.dgtoohl.com/api/v1')
  const sspApiProxy = parseProxyUrl(sspApiBaseUrl, 'https://www.staging.dgtoohl.com/api')
  const remoteImagesProxy = parseProxyUrl(remoteImagesBaseUrl, 'https://d2nljoxssb7y4b.cloudfront.net')

  return {
    plugins: [react(), tailwind()],
    server: {
      proxy: {
        '/api': {
          target: apiProxy.target,
          changeOrigin: true,
          secure: apiProxy.target.startsWith('https://'),
          rewrite: (path) => path.replace(/^\/api/, apiProxy.basePath || ''),
        },
        '/ssp-api': {
          target: sspApiProxy.target,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/ssp-api/, sspApiProxy.basePath || ''),
        },
        '/exports': {
          target: apiProxy.target,
          changeOrigin: true,
          secure: apiProxy.target.startsWith('https://'),
        },
        '/remote-images': {
          target: remoteImagesProxy.target,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/remote-images/, remoteImagesProxy.basePath || ''),
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 2000, // Suppress chunk size warnings
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
    },
  }
})
