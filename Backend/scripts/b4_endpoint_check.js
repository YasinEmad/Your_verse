/**
 * Smoke check against a *running* server. The port comes from the environment
 * (PORT, then API_URL) instead of a hardcoded 3001, so it works against whatever
 * port the dev server is actually on rather than failing with ECONNREFUSED.
 */
require('dotenv/config');

const fetch = global.fetch || require('node-fetch');

const baseUrl = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;

(async () => {
  const res = await fetch(`${baseUrl}/api/v1/worlds/anime`);
  if (!res.ok) {
    console.error(`Failed to fetch ${baseUrl}/api/v1/worlds/anime:`, res.status, await res.text());
    process.exit(2);
  }

  const body = await res.json();
  const expectedKeys = ['id', 'slug', 'name', 'status', 'direction', 'locale', 'themeTokens', 'capabilities', 'sections'];
  const missing = expectedKeys.filter((k) => !(k in body));
  if (missing.length) {
    console.error('World payload missing keys:', missing);
    process.exit(3);
  }

  console.log('World endpoint payload shape validated');
  process.exit(0);
})();
