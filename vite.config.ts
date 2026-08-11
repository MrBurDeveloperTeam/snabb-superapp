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

    const isDev = mode === "development";
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Proven (cloudflare_ref.js's own allowedOrigins list) that only
        // http://localhost:3000 and http://localhost:5173 are allowlisted
        // by the live Snabbb Worker's CORS policy. Falling back to a
        // different port would silently authenticate from an origin the
        // Worker doesn't recognize — fail fast instead so the developer
        // frees port 3000 rather than debugging a CORS rejection.
        strictPort: true,
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
          // The Worker-owned SSO handoff page (proven: /api/v1/sso/app_link's
          // Worker handler text-rewrites Odoo's raw response so the returned
          // launch URL's host is exactly "sso.snabbb.com" — see
          // cloudflare_ref.js). Visiting /sso/login?token=... is what
          // actually sets the mrbur_sso cookie /api/sso/exchange requires;
          // the previous localhost fix (47fbf38) skipped this navigation
          // entirely, so /api/sso/exchange had no SSO credential to read.
          // cookieDomainRewrite strips the upstream `Domain=.snabbb.com` so
          // the re-issued cookie is host-only and can bind to localhost
          // (HttpOnly/Secure/SameSite/Path/Max-Age all pass through
          // unchanged — Secure cookies are accepted on http://localhost per
          // the Secure Contexts spec, confirmed for both Chrome and
          // Firefox).
          //
          // The Worker's subsequent 302 Location must also be rewritten
          // back to this local origin. Vite/http-proxy's built-in
          // hostRewrite/protocolRewrite options were tried first but real
          // browser evidence proved the browser-visible Location header
          // still came through as the unmodified `https://app.snabbb.com`
          // — so this uses an explicit configure() hook instead, which
          // gives full, deterministic control rather than depending on
          // that automatic (and apparently unreliable, in this bundled
          // http-proxy version) rewrite path.
          '/sso/login': {
            target: 'https://sso.snabbb.com',
            changeOrigin: true,
            secure: false,
            cookieDomainRewrite: { '.snabbb.com': '' },
            configure: (proxy) => {
              proxy.on('proxyRes', (proxyRes) => {
                const location = proxyRes.headers['location'];
                // Missing Location (e.g. a non-redirect response, such as
                // a 400/401 from an invalid/expired token) — nothing to
                // rewrite, leave the response exactly as received.
                if (typeof location !== 'string' || location.length === 0) return;

                let parsed: URL;
                try {
                  parsed = new URL(location);
                } catch {
                  // Malformed Location — leave unchanged rather than guess.
                  console.warn('[dev-proxy] /sso/login: could not parse upstream Location header');
                  return;
                }

                // Exact, strict trusted-destination check — only the one
                // proven production destination is ever rewritten. Never
                // reads anything from the incoming request, so this can't
                // become an open redirect: the only value that ever
                // decides the outcome is the upstream response itself,
                // compared against a hardcoded host.
                const isTrustedSnabbbGalleryOrigin =
                  parsed.protocol === 'https:' && parsed.hostname === 'app.snabbb.com';
                if (!isTrustedSnabbbGalleryOrigin) return;

                proxyRes.headers['location'] = `http://localhost:3000${parsed.pathname}${parsed.search}${parsed.hash}`;
              });
            },
          },
          // Production's own Snabbb API/Worker layer (proven from
          // cloudflare_ref.js: its own routing logic checks
          // `url.hostname === "app.snabbb.com"` and it makes absolute
          // self-referential calls to `https://app.snabbb.com/api/...`) —
          // NOT raw Odoo. The Worker's routes match the full `/api/...`
          // path unchanged (e.g. `url.pathname === "/api/web/session/authenticate"`,
          // `"/api/sso/exchange"`), so every /api/* request below is
          // forwarded with its path intact — no rewrite. This replaces the
          // previous direct-to-raw-Odoo-sandbox routing, which lacked both
          // the correct database and the /api/sso/exchange controller
          // (that logic only exists in the Worker, never in any Odoo
          // instance). cookieDomainRewrite handles the Odoo `session_id`
          // cookie the same way as /sso/login above — /api/web/session/
          // get_session_info and /api/partner/profile both depend on it
          // being usable on localhost, not just mrbur_sso.
          '/api': {
            target: 'https://app.snabbb.com',
            changeOrigin: true,
            secure: false,
            cookieDomainRewrite: { '.snabbb.com': '' },
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
      plugins: [react()],
        build: {
        rollupOptions: {
          input: {
            main: 'index.html',
            ssocheck: 'sso-check.html',  // ← separate entry
          }
        }
      },
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