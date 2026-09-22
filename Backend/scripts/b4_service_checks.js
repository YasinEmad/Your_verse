const { PrismaService } = require('../dist/prisma/prisma.service');
const { SectionsService } = require('../dist/modules/worlds/sections/sections.service');

(async () => {
  const prisma = new PrismaService();
  const svc = new SectionsService(prisma);

  try {
    // attempt to create an unknown section type to verify validation
    await svc.create('a3f2396c-0fd1-423a-8284-7eb9b91b042e', { type: 'unknown_type', config: {} });
    console.error('ERROR: unknown type was accepted unexpectedly');
    process.exit(2);
  } catch (err) {
    console.log('Expected rejection for unknown type:', err && err.message ? err.message : String(err));
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
})();
