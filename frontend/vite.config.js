import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const backendEnvDir = path.resolve(__dirname, '../backend')
  const backendEnv = loadEnv(mode, backendEnvDir, '')

  const backendPort = backendEnv.APP_PORT || '3000'

  return {
    plugins: [react()],

    server: {
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})