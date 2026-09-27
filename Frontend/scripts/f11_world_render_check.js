/**
 * F11 verification (storefront) — the three remaining Worlds render through the
 * unmodified `/[worldSlug]` route.
 *
 * The World page is deliberately dumb: it fetches a payload and maps each section
 * through `renderSection`. That makes F11's acceptance criteria entirely
 * observable from the outside, so they are asserted here from the outside:
 *
 *   1.  `/chess`, `/arabic` and `/gaming` (plus the original `/anime`) all serve
 *       200 without any per-World page, route or `switch (world.slug)`.
 *   2.  `/arabic` serves `dir="rtl"` — the direction comes from the database row,
 *       so this is a data claim, not a registry claim.
 *   3.  The Chess World serves a real interactive board, not a static placeholder.
 *   4.  Each World's own sections appear, and none of them fell through
 *       `renderSection`'s validation and were silently skipped.
 *   5.  The compiled stylesheet contains real logical properties (`margin-inline-*`,
 *       `padding-inline-*`) for the shared components, so Arabic spacing mirrors
 *       instead of being pinned to the left.
 *
 * Requires the API and a built frontend:
 *   Backend:  npm run build && npm start           (port 4000)
 *   Frontend: npm run build && npm start           (port 3000)
 *   Run:      npm run check:f11
 */
const fs = require('fs');
const path = require('path');

const API_URL = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
const STOREFRONT_URL = (process.env.STOREFRONT_URL || 'http://localhost:3000').replace(/\/$/, '');

const results = [];
function assert(label, condition, detail) {
  results.push({ label, ok: Boolean(condition) });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

const WORLDS = [
  {
    slug: 'anime',
    markers: ['Anime World', 'Welcome to Anime World', 'Character showcase'],
  },
  {
    slug: 'chess',
    markers: ['Play the long game', 'Playable chess board', 'White to move'],
  },
  {
    slug: 'arabic',
    direction: 'rtl',
    markers: ['عالم العربية', 'شحن سريع'],
  },
  {
    slug: 'gaming',
    markers: ['Gear up. Play longer.', 'Esports peripherals'],
  },
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(full);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

async function getText(url) {
  const res = await fetch(url, { redirect: 'follow' });
  return { status: res.status, body: await res.text() };
}

async function run() {
  const health = await fetch(`${API_URL}/api/v1/health`).catch(() => null);
  if (!health || !health.ok) {
    console.error(`The API is not reachable at ${API_URL}. Start the backend first.`);
    process.exit(1);
  }

  for (const world of WORLDS) {
    const { status, body } = await getText(`${STOREFRONT_URL}/${world.slug}`).catch((error) => ({
      status: 0,
      body: String(error),
    }));

    assert(`/${world.slug} serves 200`, status === 200, `status=${status}`);
    assert(
      `/${world.slug} renders its World name`,
      body.includes(world.markers[0]),
      world.markers[0],
    );
    for (const marker of world.markers.slice(1)) {
      assert(`/${world.slug} renders "${marker}"`, body.includes(marker));
    }
    if (world.direction) {
      assert(`/${world.slug} serves dir="${world.direction}"`, body.includes(`dir="${world.direction}"`));
    }
    assert(
      `/${world.slug} did not fall back to the empty-composition message`,
      !body.includes('No active sections configured for this world.'),
    );
  }

  const chess = await getText(`${STOREFRONT_URL}/chess`);
  const squareCount = (chess.body.match(/aria-label="[a-h][1-8], /g) ?? []).length;
  assert(
    'the chess board renders all 64 squares with per-square labels',
    squareCount === 64,
    `squares=${squareCount}`,
  );
  assert(
    'the chess board carries real piece glyphs, not a placeholder grid',
    chess.body.includes('♔') && chess.body.includes('♚'),
  );
  assert('the chess board is playable, not read-only', chess.body.includes('>Undo<') && chess.body.includes('>Reset<'));

  const missing = await getText(`${STOREFRONT_URL}/not-a-world`);
  assert('an unknown slug 404s instead of falling back to the default layout', missing.status === 404, `status=${missing.status}`);

  const cssHrefs = [...new Set([...chess.body.matchAll(/\/_next\/static\/css\/[^"']+\.css/g)].map((m) => m[0]))];
  assert('the page links a compiled stylesheet', cssHrefs.length > 0, `${cssHrefs.length} files`);
  const css = (
    await Promise.all(cssHrefs.map((href) => getText(`${STOREFRONT_URL}${href}`).then((r) => r.body)))
  ).join('\n');
  assert(
    'the compiled CSS uses margin-inline-start for the shared list indent (RTL mirrors)',
    css.includes('margin-inline-start'),
  );
  assert(
    'the compiled CSS uses padding-inline-end for the shared table cells (RTL mirrors)',
    css.includes('padding-inline-end'),
  );
  assert(
    'the converted ms-6 utility is logical, not physical',
    !/\.ms-6\{margin-left/.test(css),
  );

  const arabicHtml = (await getText(`${STOREFRONT_URL}/arabic`)).body;
  const arabicCssHrefs = [
    ...new Set([...arabicHtml.matchAll(/\/_next\/static\/css\/[^"']+\.css/g)].map((match) => match[0])),
  ];
  const arabicCss = (
    await Promise.all(arabicCssHrefs.map((href) => getText(`${STOREFRONT_URL}${href}`).then((r) => r.body)))
  ).join('\n');
  assert(
    'the Arabic World self-hosts an Arabic font family',
    arabicCss.includes('--font-arabic'),
  );

  const registrySource = fs.readFileSync(
    path.resolve(__dirname, '../src/worlds/registry/index.ts'),
    'utf8',
  );
  for (const slug of ['chess', 'arabic', 'gaming']) {
    assert(`WORLD_REGISTRY has an entry for ${slug}`, new RegExp(`\\b${slug}: \\{`).test(registrySource));
  }
  const branching = walk(path.resolve(__dirname, '../src')).filter((file) =>
    /world\.slug\s*===|slug\s*===\s*["'](anime|tech|chess|arabic|gaming)["']/.test(
      fs.readFileSync(file, 'utf8'),
    ),
  );
  assert('no source file branches on a World slug', branching.length === 0, branching.join(', '));

  const failed = results.filter((result) => !result.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
