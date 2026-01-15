
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Fix for __dirname in ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    // Load env variables from the root directory
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/jsonrpc': {
            target: 'http://localhost:8069',
            changeOrigin: true,
            secure: false, // if you are not using HTTPS
          },
          '/web': {
            target: 'http://localhost:8069',
            changeOrigin: true,
            secure: false, // if you are not using HTTPS
          },
          '/api/protected': {
            target: 'http://localhost:8069',
            changeOrigin: true,
            secure: false, // if you are not using HTTPS
          },
          '/api/auth/login': {
            target: 'http://localhost:8069',
            changeOrigin: true,
            secure: false, // if you are not using HTTPS
          },
          '/api/auth/signup': {
            target: 'http://localhost:8069',
            changeOrigin: true,
            secure: false, // if you are not using HTTPS
          },
          '/api/auth/logout': {
            target: 'http://localhost:8069',
            changeOrigin: true,
            secure: false, // if you are not using HTTPS
          },
        },
      },
      plugins: [react()],
      define: {
        // Expose process.env.API_KEY to the frontend as required by Google GenAI guidelines
        'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY),
      },
      resolve: {
        alias: {
          // Fixed: resolve the '@' alias using the defined __dirname
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
