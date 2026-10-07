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
// Odoo.sh gives a staging branch a NEW hostname every time it is rebuilt
// (mrbur-staging-2-<build id>.dev.odoo.com). Set ODOO_STAGING_URL in your shell /
// .env.local instead of editing every proxy entry below.
const ODOO_STAGING = process.env.ODOO_STAGING_URL || 'https://mrbur-staging-2-39203776.dev.odoo.com';
const CLOUDFLARE_ASSET_LIMIT = 25 * 1024 * 1024;
const WASM_CHUNK_SIZE = 20 * 1024 * 1024;

async function findWasmFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findWasmFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.wasm') ? [entryPath] : [];
  }));
  return files.flat();
}

function splitLargeGameWasmForCloudflare() {
  let outDir = '';

  return {
    name: 'split-large-game-wasm-for-cloudflare',
    enforce: 'post' as const,
    configResolved(config: { root: string; build: { outDir: string } }) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const gamesDir = path.join(outDir, 'games');
      const wasmPaths = await findWasmFiles(gamesDir);

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

        const wasmFileName = path.basename(wasmPath);
        const loaderPath = path.join(path.dirname(wasmPath), `${path.basename(wasmPath, '.wasm')}.js`);
        const loaderSource = await readFile(loaderPath, 'utf8');
        const fetchStatement = 'return fetch(file).then(function (response) {';
        const chunkFetchStatement = `const responsePromise = file.endsWith('${wasmFileName}')
\t\t\t? Promise.all([${Array.from({ length: Math.ceil(wasmSize / WASM_CHUNK_SIZE) }, (_, index) => `fetch(\`${'${file}'}.part${index}\`)`).join(', ')}]).then(async function (responses) {
\t\t\t\tfor (const response of responses) {
\t\t\t\t\tif (!response.ok) throw new Error(\`Failed loading WASM chunk '\${response.url}'\`);
\t\t\t\t}
\t\t\t\tconst chunks = await Promise.all(responses.map(function (response) { return response.arrayBuffer(); }));
\t\t\t\treturn new Response(new Blob(chunks, { type: 'application/wasm' }), {
\t\t\t\t\theaders: { 'Content-Type': 'application/wasm' },
\t\t\t\t});
\t\t\t})
\t\t\t: fetch(file);
\t\treturn responsePromise.then(function (response) {`;

        if (!loaderSource.includes(fetchStatement)) {
          throw new Error(`Unable to add chunk loading to ${path.relative(outDir, loaderPath)}`);
        }
        await writeFile(loaderPath, loaderSource.replace(fetchStatement, chunkFetchStatement));

        unlinkSync(wasmPath);
        console.log(`Split oversized Cloudflare asset: ${path.relative(outDir, wasmPath)}`);
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
            target: ODOO_STAGING,
            changeOrigin: true,
            secure: false,
          },
          '/odoo': {
            target: ODOO_STAGING,  
            changeOrigin: true,
            secure: false,
          },
          '/api/web': {
            target: ODOO_STAGING,  
            changeOrigin: true,
            secure: false,
            rewrite: (p) => p.replace(/^\/api/, ''),
          },
          '/api': {
            target: ODOO_STAGING,  
            changeOrigin: true,
            secure: false,
          },
          '/web/session/get_session_info': {
            target: ODOO_STAGING,  
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
            target: ODOO_STAGING,
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
