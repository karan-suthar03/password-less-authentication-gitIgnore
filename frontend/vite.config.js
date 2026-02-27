import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
const BACKEND = 'https://theorem-own-funny-names.trycloudflare.com';

/**
 * Skip the proxy for browser page navigations (Accept: text/html).
 * Only forward XHR / fetch API calls (Accept: application/json) to the backend.
 * Returning false  → proxy the request.
 * Returning a path → let Vite serve it (falls through to index.html via SPA fallback).
 */
function bypassHtmlRequests(req) {
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    // Return the original URL so Vite serves the SPA's index.html
    return req.url;
  }
  // undefined → proxy as normal
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
