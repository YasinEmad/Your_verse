/**
 * F9 backend verification — Super Admin World/user/audit surface.
 *
 * Phase 9's acceptance criteria say the UI gate is UX only and the *backend*
 * must reject a lower-role user even when the UI is bypassed. This script proves
 * that through the real route + guard stack: it boots the actual
 * WorldsController / SuperAdminController / AuditController with the real
 * services against the real database, and swaps only `FirebaseSessionGuard` for
 * a stub that reads a role from a header (standing in for a verified Firebase
 * session cookie, which cannot be minted outside a browser).
 *
 * Everything else — `@Roles`, `@Permissions`, Zod pipes, Prisma writes, audit
 * rows — is the production code path.
 *
 * Run: node scripts/f9_super_admin_check.js   (requires `npm run build` first)
 */
require('dotenv/config');
require('reflect-metadata');

const { Module, UnauthorizedException, VersioningType } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { Test } = require('@nestjs/testing');
const request = require('supertest');

const { PrismaService } = require('../dist/prisma/prisma.service');
const { AuditLogService } = require('../dist/modules/audit/audit.service');
const { AuditController } = require('../dist/modules/audit/audit.controller');
const { WorldsController } = require('../dist/modules/worlds/worlds.controller');
const { WorldsService } = require('../dist/modules/worlds/worlds.service');
const { SuperAdminController } = require('../dist/modules/super-admin/super-admin.controller');
const { SuperAdminService } = require('../dist/modules/super-admin/super-admin.service');
const { FirebaseSessionGuard } = require('../dist/common/guards/firebase-session.guard');

const SLUG = `f9-check-${Date.now()}`;

/** Stands in for a verified Firebase session cookie: role from a header. */
class StubSessionGuard {
  canActivate(context) {
    const req = context.switchToHttp().getRequest();
    const role = req.headers['x-test-role'];
    if (!role) throw new UnauthorizedException('No session cookie');
    req.user = {
      id: req.headers['x-test-user-id'] || 'f9-actor',
      firebaseUid: 'stub-uid',
      email: 'f9@example.com',
      displayName: 'F9 Check',
      role,
    };
    return true;
  }
}

class CheckModule {}

Module({
  controllers: [WorldsController, SuperAdminController, AuditController],
  providers: [PrismaService, AuditLogService, WorldsService, SuperAdminService],
})(CheckModule);

const results = [];
function assert(label, condition, detail) {
  results.push({ label, ok: Boolean(condition), detail });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

async function run() {
  const moduleRef = await Test.createTestingModule({ imports: [CheckModule] })
    .overrideGuard(FirebaseSessionGuard)
    .useClass(StubSessionGuard)
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1', prefix: 'v' });
  await app.init();

  const server = app.getHttpServer();
  const prisma = app.get(PrismaService);

  // A real SUPER_ADMIN row so audit rows can reference it (AuditLog.actorUserId
  // is a FK to User) and so the self-role-change guard has a real subject.
  const stamp = Date.now();
  const actorUser = await prisma.user.create({
    data: {
      firebaseUid: `f9-actor-${stamp}`,
      email: `f9-actor-${stamp}@example.com`,
      role: 'SUPER_ADMIN',
    },
  });
  const as = (role) => ({ 'x-test-role': role, 'x-test-user-id': actorUser.id });

  let createdWorldId = null;
  let testUserId = null;

  try {
    // 1. lower roles cannot reach the Super-Admin surface
    for (const role of ['USER', 'ADMIN', 'SHIPPING']) {
      const worlds = await request(server).get('/api/v1/worlds').set(as(role));
      assert(`GET /worlds as ${role} is 403`, worlds.status === 403, `got ${worlds.status}`);

      const users = await request(server).get('/api/v1/super-admin/users').set(as(role));
      assert(
        `GET /super-admin/users as ${role} is 403`,
        users.status === 403,
        `got ${users.status}`,
      );

      const create = await request(server)
        .post('/api/v1/worlds')
        .set(as(role))
        .send({ slug: SLUG, name: 'Nope' });
      assert(`POST /worlds as ${role} is 403`, create.status === 403, `got ${create.status}`);

      const remove = await request(server)
        .delete(`/api/v1/worlds/00000000-0000-0000-0000-000000000000`)
        .set(as(role));
      assert(`DELETE /worlds/:id as ${role} is 403`, remove.status === 403, `got ${remove.status}`);

      const roleChange = await request(server)
        .patch('/api/v1/super-admin/users/00000000-0000-0000-0000-000000000000/role')
        .set(as(role))
        .send({ role: 'ADMIN' });
      assert(
        `PATCH /super-admin/users/:id/role as ${role} is 403`,
        roleChange.status === 403,
        `got ${roleChange.status}`,
      );

      const audit = await request(server).get('/api/v1/admin/audit-log').set(as(role));
      assert(
        `GET /admin/audit-log as ${role} is 403`,
        audit.status === 403,
        `got ${audit.status}`,
      );
    }

    // 2. no session at all is a 401, not a 403
    const anonymous = await request(server).get('/api/v1/worlds');
    assert('GET /worlds without a session is 401', anonymous.status === 401, `got ${anonymous.status}`);

    // 3. SUPER_ADMIN creates a World with identity fields only
    const create = await request(server)
      .post('/api/v1/worlds')
      .set(as('SUPER_ADMIN'))
      .send({
        slug: SLUG,
        name: 'F9 Check World',
        direction: 'rtl',
        themeTokens: { colors: { accent: '#123456' } },
      });
    assert('POST /worlds as SUPER_ADMIN is 201', create.status === 201, `got ${create.status}`);
    createdWorldId = create.body?.id;
    assert('created World keeps the slug', create.body?.slug === SLUG);
    assert(
      'lowercase direction is stored as the RTL enum',
      create.body?.direction === 'RTL',
      `got ${create.body?.direction}`,
    );

    // 4. the new World is immediately resolvable publicly, with zero sections
    const publicWorld = await request(server).get(`/api/v1/worlds/${SLUG}`);
    assert('new World resolves over the public endpoint', publicWorld.status === 200);
    assert(
      'new World starts with zero sections (composition stays Admin\'s)',
      Array.isArray(publicWorld.body?.sections) && publicWorld.body.sections.length === 0,
      `got ${JSON.stringify(publicWorld.body?.sections?.length)}`,
    );

    // 5. identity list is SUPER_ADMIN-readable and excludes section configs
    const list = await request(server).get('/api/v1/worlds').set(as('SUPER_ADMIN'));
    assert('GET /worlds as SUPER_ADMIN is 200', list.status === 200, `got ${list.status}`);
    const listed = list.body.find((w) => w.id === createdWorldId);
    assert('created World appears in the identity list', Boolean(listed));
    assert('identity rows carry a sectionCount', typeof listed?.sectionCount === 'number');
    assert('identity rows do not leak section configs', listed && listed.sections === undefined);

    // 6. invalid input is rejected by the Zod pipe as 400, not 500
    const badSlug = await request(server)
      .post('/api/v1/worlds')
      .set(as('SUPER_ADMIN'))
      .send({ slug: 'Not A Slug', name: '' });
    assert('POST /worlds with an invalid slug is 400', badSlug.status === 400, `got ${badSlug.status}`);

    // 7. role management round-trip
    const testUser = await prisma.user.create({
      data: { firebaseUid: `f9-${Date.now()}`, email: `f9-${Date.now()}@example.com`, role: 'USER' },
    });
    testUserId = testUser.id;

    const users = await request(server).get('/api/v1/super-admin/users?page=1&pageSize=50').set(
      as('SUPER_ADMIN'),
    );
    assert('GET /super-admin/users as SUPER_ADMIN is 200', users.status === 200, `got ${users.status}`);
    assert(
      'user directory paginates with total/totalPages',
      typeof users.body?.total === 'number' && users.body.totalPages >= 1,
      `total=${users.body?.total} totalPages=${users.body?.totalPages}`,
    );
    assert(
      'user rows expose no orders/carts',
      users.body.items.every((u) => u.orders === undefined && u.carts === undefined),
    );

    const promote = await request(server)
      .patch(`/api/v1/super-admin/users/${testUserId}/role`)
      .set(as('SUPER_ADMIN'))
      .send({ role: 'SHIPPING' });
    assert('PATCH role as SUPER_ADMIN is 200', promote.status === 200, `got ${promote.status}`);
    assert('role change is persisted', promote.body?.role === 'SHIPPING');

    const badRole = await request(server)
      .patch(`/api/v1/super-admin/users/${testUserId}/role`)
      .set(as('SUPER_ADMIN'))
      .send({ role: 'ROOT' });
    assert('PATCH role with an unknown role is 400', badRole.status === 400, `got ${badRole.status}`);

    const selfRole = await request(server)
      .patch(`/api/v1/super-admin/users/${actorUser.id}/role`)
      .set(as('SUPER_ADMIN'))
      .send({ role: 'USER' });
    assert('a Super Admin cannot change their own role', selfRole.status === 403, `got ${selfRole.status}`);

    // 8. audit trail records the actor, not the target
    const audit = await request(server).get('/api/v1/admin/audit-log?page=1&pageSize=50').set(
      as('SUPER_ADMIN'),
    );
    assert('GET /admin/audit-log as SUPER_ADMIN is 200', audit.status === 200, `got ${audit.status}`);
    const roleEntry = audit.body.items.find(
      (entry) => entry.action === 'user.role.updated' && entry.entityId === testUserId,
    );
    assert('role change is written to the audit log', Boolean(roleEntry));
    assert(
      'audit entry is attributed to the acting admin, not the target',
      roleEntry?.actorUserId === actorUser.id && roleEntry?.actor?.email === actorUser.email,
      `actorUserId=${roleEntry?.actorUserId} actor=${roleEntry?.actor?.email}`,
    );
    const worldEntry = audit.body.items.find(
      (entry) => entry.action === 'world.created' && entry.entityId === createdWorldId,
    );
    assert('world creation is written to the audit log', Boolean(worldEntry));

    // 9. lifecycle: deactivate hides the World from the public route, reactivate restores it
    const deactivate = await request(server)
      .patch(`/api/v1/worlds/${createdWorldId}`)
      .set(as('SUPER_ADMIN'))
      .send({ status: 'INACTIVE' });
    assert('PATCH status as SUPER_ADMIN is 200', deactivate.status === 200, `got ${deactivate.status}`);
    assert('lowercase status is stored as the INACTIVE enum', deactivate.body?.status === 'INACTIVE');

    const stillThere = await request(server).get(`/api/v1/worlds/${SLUG}`);
    assert('deactivated World still resolves by slug (route 404s on status)', stillThere.status === 200);
    assert('deactivated World reports INACTIVE', stillThere.body?.status === 'INACTIVE');

    // 10. delete, then confirm it is gone
    const remove = await request(server)
      .delete(`/api/v1/worlds/${createdWorldId}`)
      .set(as('SUPER_ADMIN'));
    assert('DELETE /worlds/:id as SUPER_ADMIN is 200', remove.status === 200, `got ${remove.status}`);

    const gone = await request(server).get(`/api/v1/worlds/${SLUG}`);
    assert('deleted World 404s on the public endpoint', gone.status === 404, `got ${gone.status}`);
  } finally {
    // deleteMany so cleanup is idempotent even though the World is already gone
    if (createdWorldId) {
      await prisma.world.deleteMany({ where: { id: createdWorldId } });
      await prisma.auditLog.deleteMany({ where: { entityId: createdWorldId } });
    }
    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId } });
      await prisma.auditLog.deleteMany({ where: { entityId: testUserId } });
    }
    await prisma.auditLog.deleteMany({ where: { actorUserId: actorUser.id } });
    await prisma.user.deleteMany({ where: { id: actorUser.id } });
    await app.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length === 0 ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(9);
});
