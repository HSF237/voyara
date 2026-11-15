/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {
  createServer,
  defineConfig,
  loadEnv,
  type Connect,
  type Plugin,
  type ViteDevServer,
} from 'vite';

/**
 * Runs the server functions in /api during `npm run dev` and `npm run preview`,
 * the same way Vercel runs them in production: each file exports GET/POST
 * taking a web Request and returning a Response. Server-only variables from
 * .env.local are made available to them and never reach the browser bundle.
 */
function apiRoutes(): Plugin {
  let loader: ViteDevServer | undefined;

  const handle =
    (getLoader: () => Promise<ViteDevServer>): Connect.NextHandleFunction =>
    (req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const match = /^\/api\/([a-z][a-z0-9-]*)$/.exec(url.pathname);
      if (!match) return next();
      void (async () => {
        try {
          const module = (await (await getLoader()).ssrLoadModule(`/api/${match[1]}.ts`)) as Record<
            string,
            ((request: Request) => Promise<Response>) | undefined
          >;
          const method = (req.method ?? 'GET').toUpperCase();
          const handler = module[method];
          if (!handler) {
            res.statusCode = 405;
            return res.end();
          }
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const headers = new Headers();
          for (const [name, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(name, value);
          }
          const response = await handler(
            new Request(url, {
              method,
              headers,
              body: method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks),
            }),
          );
          res.statusCode = response.status;
          response.headers.forEach((value, name) => res.setHeader(name, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          console.error(`[api] ${url.pathname} failed`, error);
          res.statusCode = url.pathname && String(error).includes('Failed to load') ? 404 : 500;
          res.end();
        }
      })();
    };

  return {
    name: 'voyara-api-routes',
    config(_, { mode }) {
      for (const [name, value] of Object.entries(loadEnv(mode, process.cwd(), ''))) {
        if (!name.startsWith('VITE_') && process.env[name] === undefined) process.env[name] = value;
      }
    },
    configureServer(server) {
      server.middlewares.use(handle(() => Promise.resolve(server)));
    },
    configurePreviewServer(server) {
      const getLoader = async () =>
        (loader ??= await createServer({
          configFile: false,
          server: { middlewareMode: true, hmr: false, ws: false },
          appType: 'custom',
          optimizeDeps: { noDiscovery: true },
        }));
      server.middlewares.use(handle(getLoader));
      server.httpServer.once('close', () => void loader?.close());
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiRoutes()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
