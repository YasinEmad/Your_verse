/**
 * CORS — backend-architecture.md §15.
 *
 *     app.enableCors({
 *       origin: [process.env.FRONTEND_URL], // exact allowlist, no wildcards
 *       credentials: true,                   // so the session cookie is sent
 *     });
 *
 * `credentials: true` is the whole reason this needs care: the combination of
 * "credentials on" and "reflect any origin" is the classic setup for letting any
 * site read authenticated responses. So there is no wildcard fallback and no
 * origin-reflection — the list is exactly what the env says, and an origin that
 * is not in it gets no CORS headers at all (the browser then blocks the response
 * and the server never answers the preflight).
 *
 * `FRONTEND_URLS` (comma-separated) is the multi-origin form for staging; it
 * falls back to the single `FRONTEND_URL`. Unset means cross-origin is closed,
 * which fails visibly in dev instead of silently open in prod.
 */
export function corsOriginAllowlist(): string[] {
  const raw = process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? '';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const CORS_CONFIG = {
  origin: corsOriginAllowlist(),
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  // The docs UI and any Swagger-initiated browser call need to read the spec.
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 600,
} as const;
