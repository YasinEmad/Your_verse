/**
 * B4 service-level check — section reorder atomicity.
 *
 * Creates its own World and two sections rather than reusing a seeded one: the
 * previous version hardcoded a `worldId` from a database that no longer exists, so
 * it died on `before[0].id` instead of testing anything. A check that only runs
 * against leftover data is not a check.
 *
 * The property under test: a reorder containing one unknown section id must change
 * *nothing*. Reorder is a `$transaction`, and every id is verified to belong to the
 * World before the first write, so a failure cannot leave positions half-applied.
 */
const { PrismaService } = require('../dist/prisma/prisma.service');
const { AuditLogService } = require('../dist/modules/audit/audit.service');
const { SectionsService } = require('../dist/modules/worlds/sections/sections.service');

(async () => {
  const prisma = new PrismaService();
  // SectionsService writes an audit row on every mutation, so the real audit
  // service is part of what is under test here, not a stub.
  const svc = new SectionsService(prisma, new AuditLogService(prisma));
  const slug = `b4-reorder-${Date.now()}`;

  try {
    const world = await prisma.world.create({ data: { slug, name: 'B4 Reorder', themeTokens: {} } });
    const worldId = world.id;
    const first = await svc.create(worldId, { type: 'hero', config: {} });
    await svc.create(worldId, { type: 'feature_section', config: {} });

    const before = await svc.listForWorld(worldId);
    console.log('Before positions:', before.map((s) => ({ id: s.id, position: s.position })));
    if (before.length !== 2) {
      console.error(`Expected 2 sections, found ${before.length}`);
      process.exit(4);
    }

    // attempt an atomic reorder where one id is invalid to force failure
    const badPositions = [
      { id: first.id, position: 10 },
      { id: '00000000-0000-0000-0000-000000000000', position: 20 },
    ];

    let failedAsExpected = false;
    try {
      await svc.reorder(worldId, badPositions);
      console.error('ERROR: reorder unexpectedly succeeded');
    } catch (err) {
      failedAsExpected = true;
      console.log('Reorder failed as expected:', err.message || String(err));
    }

    const after = await svc.listForWorld(worldId);
    console.log('After positions:', after.map((s) => ({ id: s.id, position: s.position })));

    const same = JSON.stringify(before.map((s) => ({ id: s.id, position: s.position }))) ===
      JSON.stringify(after.map((s) => ({ id: s.id, position: s.position })));

    if (!failedAsExpected) {
      console.error('Atomicity FAILED: the invalid id was not rejected');
      process.exit(2);
    }
    if (!same) {
      console.error('Atomicity FAILED: positions changed despite failed reorder');
      process.exit(3);
    }
    console.log('Atomicity verified: positions unchanged after failed reorder');
  } finally {
    // leave no rows behind, and delete the sections first: the FK to `worlds` is
    // restrict-by-default.
    const world = await prisma.world.findUnique({ where: { slug }, select: { id: true } });
    if (world) {
      await prisma.worldSection.deleteMany({ where: { worldId: world.id } });
      await prisma.world.delete({ where: { id: world.id } });
    }
    await prisma.$disconnect();
  }
})();
