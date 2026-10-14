import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { API } from './src/api.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': API,
    },
  },
})
