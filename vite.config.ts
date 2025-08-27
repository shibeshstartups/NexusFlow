import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Add Sentry plugin for production builds
    process.env.NODE_ENV === 'production' && process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        assets: ['./dist/assets/*.js', './dist/assets/*.css'],
        ignore: ['node_modules']
      },
      release: {
        name: process.env.npm_package_version || '1.0.0',
        deploy: {
          env: 'production'
        }
      }
    })
  ].filter(Boolean),
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    sourcemap: true, // Enable source maps for Sentry
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          query: ['@tanstack/react-query'],
          router: ['react-router-dom'],
          ui: ['lucide-react'],
          monitoring: ['@sentry/react', 'web-vitals']
        }
      }
    }
  },
  define: {
    // Enable performance monitoring in production
    __ENABLE_PERFORMANCE_MONITORING__: process.env.NODE_ENV === 'production'
  }
});
