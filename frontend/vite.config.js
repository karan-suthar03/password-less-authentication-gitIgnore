import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/signup':             'http://localhost:3000',
      '/enroll-device':      'http://localhost:3000',
      '/login':              'http://localhost:3000',
      '/request-new-device': 'http://localhost:3000',
      '/approve-device':     'http://localhost:3000',
      '/revoke-device':      'http://localhost:3000',
      '/protected':          'http://localhost:3000',
    }
  }
})
