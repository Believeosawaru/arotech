import { env } from '../config.js';

/**
 * Accept the explicitly configured origin in all environments. During local
 * development Vite may advance from :5173 to :5174 (or another available
 * nearby port), so allow only loopback Vite origins in that environment.
 * Production remains restricted to CLIENT_ORIGIN.
 */
export function isAllowedOrigin(origin: string): boolean {
  if (origin === env.CLIENT_ORIGIN) return true;
  if (env.NODE_ENV !== 'development') return false;

  try {
    const url = new URL(origin);
    const port = Number(url.port);
    return (
      url.origin === origin &&
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
      port >= 5173 && port <= 5199
    );
  } catch {
    return false;
  }
}

/** Use the active Vite origin for local test-only verification links and redirects. */
export function clientOriginForRequest(origin?: string): string {
  return origin && isAllowedOrigin(origin) ? origin : env.CLIENT_ORIGIN;
}
