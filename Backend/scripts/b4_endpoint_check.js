const fetch = global.fetch || require('node-fetch');

(async () => {
  const res = await fetch('http://localhost:3001/api/v1/worlds/anime');
  if (!res.ok) {
    console.error('Failed to fetch world endpoint:', res.status, await res.text());
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
