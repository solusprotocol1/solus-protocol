import { defineConfig } from 'vite'
import { resolve } from 'path'

// S4 Ledger — Vite Build Configuration
// Builds the modular source files into optimized production bundles.
// The build output goes to dist/ which Vercel serves.
export default defineConfig({
  root: 'src',
  base: '/prod-app/dist/',
  publicDir: '../public',

  build: {
    outDir: '../dist',
    emptyOutDir: true,

    // Generate source maps for debugging (disable in prod if needed)
    sourcemap: true,

    rollupOptions: {
      input: resolve(__dirname, 'src/index.html'),

      // Disable tree-shaking — all functions are called via window.xyz exports
      // and onclick handlers, which Rollup can't statically analyze
      treeshake: false,

      output: {
        // Split vendor chunks for better caching
        manualChunks: {
          // The main engine is the largest chunk (~640KB source)
          'engine': [resolve(__dirname, 'src/js/engine.js')],
          // Enhancement suite is the second largest (~400KB source)
          'enhancements': [resolve(__dirname, 'src/js/enhancements.js')],
          // Everything else bundles together as 'core'
        },
        // Use content hashes for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    // Target modern browsers (DoD uses Edge/Chrome on Flankspeed)
    target: 'es2020',

    // Minification — use terser to preserve window-exported functions
    // esbuild's dead code elimination removes functions only referenced
    // via window.xyz = xyz (not detectable as ES module exports)
    minify: 'terser',
    terserOptions: {
      compress: {
        dead_code: false,
        unused: false,
        side_effects: false,
      },
      mangle: true,
    },

    // Warn if chunks exceed 500KB
    chunkSizeWarningLimit: 500,
  },

  // Dev server configuration
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'https://s4ledger.com',
        changeOrigin: true,
      },
    },
  },
})
