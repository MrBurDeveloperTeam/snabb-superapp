import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream, statSync, unlinkSync } from 'fs';
import { open, readFile, readdir, writeFile } from 'fs/promises';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sharedGamesPlugin } from './node_modules/@mrburdeveloperteam/pet-function/scripts/vite-games.mjs';

// Fix for __dirname in ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLOUDFLARE_ASSET_LIMIT = 25 * 1024 * 1024;
const GAME_CHUNK_SIZE = 20 * 1024 * 1024;

async function findGameFiles(directory: string, extensions: string[]): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findGameFiles(entryPath, extensions);
    return entry.isFile() && extensions.some(extension => entry.name.endsWith(extension)) ? [entryPath] : [];
  }));
  return files.flat();
}

function splitLargeGameAssetsForCloudflare() {
  let outDir = '';

  return {
    name: 'split-large-game-assets-for-cloudflare',
    enforce: 'post' as const,
    configResolved(config: { root: string; build: { outDir: string } }) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const gamesDir = path.join(outDir, 'games');
      const wasmPaths = await findGameFiles(gamesDir, ['.wasm', '.pck']);
      const chunkCounts: Record<string, number> = {};

      for (const wasmPath of wasmPaths) {
        const wasmSize = statSync(wasmPath).size;
        if (wasmSize <= CLOUDFLARE_ASSET_LIMIT) continue;

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
                end: Math.min(offset + GAME_CHUNK_SIZE, wasmSize) - 1,
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
            offset += GAME_CHUNK_SIZE;
            part += 1;
          }
        } finally {
          await source.close();
        }

        chunkCounts['/games/' + path.relative(gamesDir, wasmPath).split(path.sep).join('/')] = Math.ceil(wasmSize / GAME_CHUNK_SIZE);

        unlinkSync(wasmPath);
        console.log(`Split oversized Cloudflare asset: ${path.relative(outDir, wasmPath)}`);
      }
      // Every Godot loader can load another game's pack through the shared engine.
      const fetchStatement = 'return fetch(file).then(function (response) {';
      const chunkFetchStatement = `const chunkCounts = ${JSON.stringify(chunkCounts)};
        const assetUrl = new URL(file, location.href);
        const partCount = assetUrl.origin === location.origin ? chunkCounts[assetUrl.pathname] : 0;
        const responsePromise = partCount
          ? Promise.all(Array.from({ length: partCount }, function (_, index) {
              const partUrl = new URL(assetUrl.href);
              partUrl.pathname += '.part' + index;
              return fetch(partUrl.href).then(function (response) {
                if (!response.ok) throw new Error('Failed loading game asset chunk: ' + response.url);
                return response.arrayBuffer();
              });
            })).then(function (chunks) {
              const type = assetUrl.pathname.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream';
              const blob = new Blob(chunks, { type: type });
              return new Response(blob, { headers: { 'Content-Type': type, 'Content-Length': String(blob.size) } });
            })
          : fetch(file);
        return responsePromise.then(function (response) {`;
      for (const loaderPath of await findGameFiles(gamesDir, ['.js'])) {
        const loaderSource = await readFile(loaderPath, 'utf8');
        if (loaderSource.includes(fetchStatement)) {
          await writeFile(loaderPath, loaderSource.replace(fetchStatement, chunkFetchStatement));
        }
      }

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
      plugins: [react(), sharedGamesPlugin(), splitLargeGameAssetsForCloudflare()],
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
