import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream, existsSync, statSync, unlinkSync } from 'fs';
import { open } from 'fs/promises';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sharedGamesPlugin } from './node_modules/@mrburdeveloperteam/pet-function/scripts/vite-games.mjs';

// Fix for __dirname in ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLOUDFLARE_ASSET_LIMIT = 25 * 1024 * 1024;
const WASM_CHUNK_SIZE = 20 * 1024 * 1024;

function splitLargeGameWasmForCloudflare() {
  let outDir = '';

  return {
    name: 'split-large-game-wasm-for-cloudflare',
    enforce: 'post' as const,
    configResolved(config: { root: string; build: { outDir: string } }) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const wasmPath = path.join(outDir, 'games', 'mole-game', 'index.wasm');
      if (!existsSync(wasmPath)) return;

      const wasmSize = statSync(wasmPath).size;
      if (wasmSize <= CLOUDFLARE_ASSET_LIMIT) return;

      const source = await open(wasmPath, 'r');
      try {
        let offset = 0;
        let part = 0;
        while (offset < wasmSize) {
          const partPath = `${wasmPath}.part${part}`;
          await new Promise<void>((resolve, reject) => {
            const stream = createReadStream(wasmPath, {
              fd: source.fd,
              autoClose: false,
              start: offset,
              end: Math.min(offset + WASM_CHUNK_SIZE, wasmSize) - 1,
            });
            const chunks: Buffer[] = [];
            stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on('error', reject);
            stream.on('end', async () => {
              try {
                const target = await open(partPath, 'w');
                try {
                  await target.writeFile(Buffer.concat(chunks));
                } finally {
                  await target.close();
                }
                resolve();
              } catch (error) {
                reject(error);
              }
            });
          });
          offset += WASM_CHUNK_SIZE;
          part += 1;
        }
      } finally {
        await source.close();
      }

      unlinkSync(wasmPath);
      console.log(`Split oversized Cloudflare asset: ${path.relative(outDir, wasmPath)}`);
    },
  };
}

export default defineConfig(({ mode }) => {
  
    const isDev = mode === "development";
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        strictPort: false,
        allowedHosts: true,  // Changed to true instead of 'all'
        hmr: {
          clientPort: 3000,
        },
        proxy: isDev ?{
          // '/api/v1/users': {
          //   target: 'http://localhost:8069',
          //   changeOrigin: true,
          //   secure: false,
          // },
          "/web": {
            target: "https://mrbur-sandbox.odoo.com",
            changeOrigin: true,
            secure: false,
          },
          '/odoo': {
            target: 'https://mrbur-sandbox.odoo.com',  
            changeOrigin: true,
            secure: false,
          },
          '/api/web': {
            target: 'https://mrbur-sandbox.odoo.com',  
            changeOrigin: true,
            secure: false,
            rewrite: (p) => p.replace(/^\/api/, ''),
          },
          '/api': {
            target: 'https://mrbur-sandbox.odoo.com',  
            changeOrigin: true,
            secure: false,
          },
          '/web/session/get_session_info': {
            target: 'https://mrbur-staging-bur-26090883.dev.odoo.com',  
            changeOrigin: true,
            secure: false,
          },
          '/mini': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            secure: false,
            ws: true,
            rewrite: (p) => p.replace(/^\/mini/, ''),
          },
          '/auth_saml': {
            target: 'http://localhost:8069',
            changeOrigin: true,
            secure: false,
          },
          '/event': {
            target: 'http://localhost:8069',
            changeOrigin: true,
            secure: false,
          },
          '/jsonrpc': {
            target: 'http://localhost:8069',
            changeOrigin: true,
            secure: false,
          },
          '/api/protected': {
            target: 'http://localhost:8069',
            changeOrigin: true,
            secure: false,
          },
          '/api/auth/login': {
            target: 'http://localhost:8069',
            changeOrigin: true,
            secure: false,
          },
          '/api/v1/users': {
            target: 'https://mrbur-sandbox.odoo.com',
            changeOrigin: true,
            secure: false,
          },
          '/api/auth/logout': {
            target: 'http://localhost:8069',
            changeOrigin: true,
            secure: false,
          },
          '/api/auth/redirect': {
            target: "http://localhost:8069",
            changeOrigin: true,
            secure: false,
            ws: true,
          },
        }: undefined,
      },
      plugins: [react(), sharedGamesPlugin(), splitLargeGameWasmForCloudflare()],
        build: {
        rollupOptions: {
          input: {
            main: 'index.html',
            ssocheck: 'sso-check.html',  // ← separate entry
          }
        }
      },
      resolve: {
        dedupe: ['react', 'react-dom'],
        alias: {
          // Fixed: resolve the '@' alias using the defined __dirname
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
