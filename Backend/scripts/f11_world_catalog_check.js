/**
 * F11 verification — the remaining Worlds (Chess, Arabic RTL, Gaming).
 *
 * The storefront's World pages are pure data + registry, so "F11 works" is a set
 * of claims about data and code that can silently rot:
 *
 *   1.  The seeded catalog contains the four initial Worlds, and every configured
 *       section's `config` actually satisfies its Section Registry schema. A bad
 *       config is *not* an API or database error: `renderSection` drops it with a
 *       console warning and the section silently disappears from the page, so
 *       nothing else in the stack would ever complain.
 *   2.  The Arabic World is stored as RTL and the other three as LTR, because the
 *       store layout derives `<div dir>` from the database value, not the registry.
 *   3.  The Super Admin → Admin composition path accepts *every* registered
 *       section type. The backend allowlist used to be a stale hardcoded trio
 *       (`hero`, `products`, `rich_text`) that no longer matched the frontend, so
 *       the section manager could not add any section the storefront renders.
 *   4.  The backend allowlist and the frontend registry cannot drift apart again.
 *
 * Run: npm run check:f11   (requires `npm run build` first)
 */
require('dotenv/config');
require('reflect-metadata');
const fs = require('fs');
const path = require('path');

const { Test } = require('@nestjs/testing');
const request = require('supertest');

const { AppModule } = require('../dist/app.module');
const { configureApp } = require('../dist/bootstrap');
const { FirebaseSessionGuard } = require('../dist/common/guards/firebase-session.guard');
const { KNOWN_SECTION_TYPES } = require('../dist/modules/worlds/sections/section-types');
const { PrismaService } = require('../dist/prisma/prisma.service');

class StubSessionGuard {
  canActivate(context) {
    const req = context.switchToHttp().getRequest();
    const role = req.headers['x-test-role'];
    req.user = {
      id: req.headers['x-test-user-id'] || 'f11-actor',
      firebaseUid: 'stub-uid',
      email: `${String(role).toLowerCase()}@example.com`,
      displayName: 'F11 Check',
      role,
    };
    return true;
  }
}

const results = [];
function assert(label, condition, detail) {
  results.push({ label, ok: Boolean(condition) });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

const REGISTRY_SOURCE = path.resolve(
  __dirname,
  '../../Frontend/src/worlds/sections/registry.ts',
);

/** Section types the frontend can actually render, read out of its registry source. */
function frontendSectionTypes() {
  const source = fs.readFileSync(REGISTRY_SOURCE, 'utf8');
  const block = source.slice(
    source.indexOf('export const sectionSchemas'),
    source.indexOf('} as const;'),
  );
  return [...block.matchAll(/^ {2}([a-z_]+): z\.object\(/gm)].map((match) => match[1]);
}

/**
 * The subset of Section Registry validation that is load-bearing here: the fields
 * whose absence or wrong shape makes `renderSection` skip the section. Mirrors
 * `Frontend/src/worlds/sections/registry.ts`; it cannot reuse the Zod schemas
 * because they live in the other workspace.
 */
const CONFIG_RULES = {
  hero: (config) =>
    typeof config.title === 'string' &&
    (config.subtitle === undefined || typeof config.subtitle === 'string') &&
    typeof config.imageUrl === 'string',
  product_grid: (config) =>
    typeof config.title === 'string' && Number.isInteger(config.limit) && config.limit >= 1,
  collection: (config) => typeof config.collectionSlug === 'string',
  feature_section: (config) =>
    Array.isArray(config.features) &&
    config.features.every(
      (feature) =>
        typeof feature?.title === 'string' &&
        typeof feature?.body === 'string' &&
        typeof feature?.icon === 'string',
    ),
  product_comparison: (config) =>
    Array.isArray(config.productIds) &&
    config.productIds.length >= 2 &&
    config.productIds.length <= 4,
  character_showcase: (config) => Array.isArray(config.characterIds),
  chess_hero: (config) => typeof config.title === 'string',
  chess_board: (config) => ['preview', 'puzzle'].includes(config.mode),
};

const EXPECTED_WORLDS = [
  { slug: 'anime', direction: 'LTR', minSections: 6 },
  { slug: 'chess', direction: 'LTR', minSections: 4 },
  { slug: 'arabic', direction: 'RTL', minSections: 3 },
  { slug: 'gaming', direction: 'LTR', minSections: 4 },
];

async function run() {
  const registryTypes = frontendSectionTypes();
  assert(
    'the backend section allowlist matches the frontend Section Registry',
    registryTypes.length > 0 &&
      registryTypes.length === KNOWN_SECTION_TYPES.length &&
      registryTypes.every((type) => KNOWN_SECTION_TYPES.includes(type)),
    `frontend=[${registryTypes.join(',')}] backend=[${KNOWN_SECTION_TYPES.join(',')}]`,
  );

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(FirebaseSessionGuard)
    .useClass(StubSessionGuard)
    .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  const server = app.getHttpServer();
  const prisma = app.get(PrismaService);

  const csrf = ['X-Requested-With', 'yourverse'];
  const slug = `f11-check-${Date.now()}`;
  let worldId = null;

  try {
    for (const expected of EXPECTED_WORLDS) {
      const res = await request(server).get(`/api/v1/worlds/${expected.slug}`);
      const world = res.body;
      assert(`${expected.slug} renders through the public World route`, res.status === 200, `status=${res.status}`);

      const sections = world?.sections ?? [];
      const broken = sections.filter(
        (section) => !CONFIG_RULES[section.type] || !CONFIG_RULES[section.type](section.config),
      );
      assert(
        `${expected.slug} sections all pass their registry schema`,
        broken.length === 0,
        broken.length ? JSON.stringify(broken.map((s) => s.type)) : `${sections.length} sections`,
      );
      assert(
        `${expected.slug} is composed (at least ${expected.minSections} enabled sections)`,
        sections.filter((section) => section.enabled).length >= expected.minSections,
        `enabled=${sections.filter((section) => section.enabled).length}`,
      );
      assert(
        `${expected.slug} direction is ${expected.direction}`,
        world?.direction === expected.direction,
        `direction=${world?.direction}`,
      );
    }

    const arabic = (await request(server).get('/api/v1/worlds/arabic')).body;
    assert(
      'the Arabic World carries a store name in Arabic script',
      /[\u0600-\u06FF]/.test(arabic?.name ?? ''),
      `name=${arabic?.name}`,
    );

    const chess = (await request(server).get('/api/v1/worlds/chess')).body;
    const board = (chess?.sections ?? []).find((section) => section.type === 'chess_board');
    assert(
      'the Chess World is composed with an interactive board section',
      board?.config?.mode === 'puzzle',
      `mode=${board?.config?.mode}`,
    );

    const unknownSlug = await request(server).get('/api/v1/worlds/does-not-exist');
    assert('an unknown slug is still a 404 in the §13 shape', unknownSlug.status === 404, `status=${unknownSlug.status}`);

    const created = await request(server)
      .post('/api/v1/worlds')
      .set(...csrf)
      .set('x-test-role', 'SUPER_ADMIN')
      .send({
        slug,
        name: 'F11 Composition Check',
        locale: 'en',
        direction: 'ltr',
        themeTokens: { colors: { background: '#ffffff' } },
        capabilities: { hasChessBoard: true },
      });
    worldId = created.body?.id ?? null;
    assert(
      'Super Admin can create a World identity (Phase 9 route)',
      created.status === 201 && Boolean(worldId),
      `status=${created.status} body=${JSON.stringify(created.body).slice(0, 120)}`,
    );

    const createdSections = [];
    for (const type of KNOWN_SECTION_TYPES) {
      const config = {
        hero: { title: 'H', imageUrl: 'https://example.com/a.png' },
        product_grid: { title: 'G', limit: 4 },
        collection: { collectionSlug: 'c' },
        feature_section: { features: [{ title: 't', body: 'b', icon: 'i' }] },
        product_comparison: { productIds: ['a', 'b'] },
        character_showcase: { characterIds: ['a'] },
        chess_hero: { title: 'CH' },
        chess_board: { mode: 'preview' },
      }[type];
      const res = await request(server)
        .post(`/api/v1/worlds/${worldId}/sections`)
        .set(...csrf)
        .set('x-test-role', 'ADMIN')
        .send({ type, config });
      createdSections.push({ type, status: res.status, body: res.body });
    }
    const rejected = createdSections.filter((section) => section.status !== 201);
    assert(
      'Admin can compose every registered section type',
      rejected.length === 0,
      rejected.length ? JSON.stringify(rejected) : `${createdSections.length} types`,
    );

    const reordered = await request(server)
      .patch(`/api/v1/worlds/${worldId}/sections/reorder`)
      .set(...csrf)
      .set('x-test-role', 'ADMIN')
      .send([
        { id: createdSections[0].body.id, position: 1 },
        { id: createdSections[1].body.id, position: 0 },
      ]);
    assert(
      'the section manager can reorder a fresh composition',
      reordered.status === 200 && reordered.body[0].id === createdSections[1].body.id,
      `status=${reordered.status}`,
    );

    const denied = await request(server)
      .post(`/api/v1/worlds/${worldId}/sections`)
      .set(...csrf)
      .set('x-test-role', 'CUSTOMER')
      .send({ type: 'hero', config: { title: 'x', imageUrl: 'https://example.com/a.png' } });
    assert(
      'composition is still Admin-only, not open to customers',
      denied.status === 403,
      `status=${denied.status} body=${JSON.stringify(denied.body).slice(0, 100)}`,
    );

    const asAdmin = await request(server)
      .post('/api/v1/worlds')
      .set(...csrf)
      .set('x-test-role', 'ADMIN')
      .send({ slug: `${slug}-admin`, name: 'Should Not Exist' });
    assert(
      'World identity is still Super Admin-only',
      asAdmin.status === 403,
      `status=${asAdmin.status}`,
    );
  } finally {
    if (worldId) {
      await prisma.worldSection.deleteMany({ where: { worldId } });
      await prisma.world.deleteMany({ where: { id: worldId } });
    }
    const leftovers = await prisma.world.findMany({
      where: { slug: { startsWith: 'f11-check-' } },
      select: { slug: true },
    });
    assert('the check leaves no World rows behind', leftovers.length === 0, JSON.stringify(leftovers));
    await app.close();
  }

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
