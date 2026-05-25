import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:5000',
          changeOrigin: true,
          rewrite: (path) => path // Keep the path as is for API routing
        }
      }
    },
    build: {
      // Increase chunk warning limit to avoid Vercel/Vite warnings for large bundles
      // value is in KB (e.g., 2000 = 2MB)
      chunkSizeWarningLimit: 2000
    }
  };
});
