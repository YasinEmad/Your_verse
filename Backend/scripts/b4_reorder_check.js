const { PrismaService } = require('../dist/prisma/prisma.service');
const { SectionsService } = require('../dist/modules/worlds/sections/sections.service');

(async () => {
  const prisma = new PrismaService();
  const svc = new SectionsService(prisma);
  const worldId = 'a3f2396c-0fd1-423a-8284-7eb9b91b042e';

  try {
    const before = await svc.listForWorld(worldId);
    console.log('Before positions:', before.map((s) => ({ id: s.id, position: s.position })));

    // attempt an atomic reorder where one id is invalid to force failure
    const badPositions = [
      { id: before[0].id, position: 10 },
      { id: '00000000-0000-0000-0000-000000000000', position: 20 },
    ];

    try {
      await svc.reorder(worldId, badPositions);
      console.error('ERROR: reorder unexpectedly succeeded');
      process.exit(2);
    } catch (err) {
      console.log('Reorder failed as expected:', err.message || String(err));
    }

    const after = await svc.listForWorld(worldId);
    console.log('After positions:', after.map((s) => ({ id: s.id, position: s.position })));

    const same = JSON.stringify(before.map((s) => ({ id: s.id, position: s.position }))) ===
      JSON.stringify(after.map((s) => ({ id: s.id, position: s.position })));

    if (same) {
      console.log('Atomicity verified: positions unchanged after failed reorder');
      process.exit(0);
    } else {
      console.error('Atomicity FAILED: positions changed despite failed reorder');
      process.exit(3);
    }
  } finally {
    await prisma.$disconnect();
  }
})();
