import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

const BACKEND = 'http://localhost:3001';

function bypassHtmlRequests(req) {
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return req.url;
  }
}

const proxyOpts = {
  target: BACKEND,
  changeOrigin: true,
  secure: false, 
  bypass: bypassHtmlRequests,
};

export default defineConfig({
  plugins: [react()],
  server: {
    cors: true,
    allowedHosts: true,
    proxy: {
      '/signup':             proxyOpts,
      '/enroll-device':      proxyOpts,
      '/login':              proxyOpts,
      '/logout':             proxyOpts,
      '/auth':               proxyOpts,
      '/request-new-device': proxyOpts,
      '/approve-device':     proxyOpts,
      '/revoke-device':      proxyOpts,
      '/protected':          proxyOpts,
      '/backdoor':           proxyOpts,
      '/new-device':         proxyOpts,
    }
  }
})
