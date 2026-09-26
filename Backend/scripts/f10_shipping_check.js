/**
 * F10 backend verification — Shipping desk (Phase 10, frontend-architecture.md §30).
 *
 * Phase 10's acceptance criteria are mostly about what must NOT happen, so this
 * script boots the real ShippingController / ProductsController / SuperAdminController
 * with the real services against the real database, swapping only
 * `FirebaseSessionGuard` for a stub that reads a role from a header (standing in
 * for a verified Firebase session cookie, which cannot be minted outside a
 * browser). Guards, `@Permissions`, Zod pipes, Prisma reads/writes and the audit
 * writer are all production code paths.
 *
 * It proves:
 *   1. a SHIPPING session can list shipments and update a shipment, and the
 *      change is visible on the next read (the invalidation the UI relies on);
 *   2. the list/update responses carry a shipping label and nothing else — no
 *      customer email/role/user id, no product row, no money;
 *   3. a USER session is rejected with 403 on both shipment endpoints, even
 *      though the dashboard UI would never have rendered the form;
 *   4. a SHIPPING session is rejected on the product *mutation* endpoints and on
 *      /super-admin/users. (Product catalog GETs are deliberately public — the
 *      storefront depends on them — so those are asserted public, not forbidden.)
 *   5. the illegal state-machine jumps are 400s, and an empty PATCH is 400;
 *   6. the audit row for a status change names the acting shipping user, not the
 *      customer who placed the order.
 *
 * Run: npm run check:f10   (requires `npm run build` first)
 */
require('dotenv/config');
require('reflect-metadata');

const { Module, UnauthorizedException, VersioningType } = require('@nestjs/common');
const { Test } = require('@nestjs/testing');
const request = require('supertest');

const { PrismaService } = require('../dist/prisma/prisma.service');
const { AuditLogService } = require('../dist/modules/audit/audit.service');
const { AuditController } = require('../dist/modules/audit/audit.controller');
const { ShippingController } = require('../dist/modules/shipping/shipping.controller');
const { ShippingService } = require('../dist/modules/shipping/shipping.service');
const { ProductsController } = require('../dist/modules/products/products.controller');
const { ProductsService } = require('../dist/modules/products/products.service');
const { SuperAdminController } = require('../dist/modules/super-admin/super-admin.controller');
const { SuperAdminService } = require('../dist/modules/super-admin/super-admin.service');
const { FirebaseSessionGuard } = require('../dist/common/guards/firebase-session.guard');

const STAMP = Date.now();

/** Stands in for a verified Firebase session cookie: role from a header. */
class StubSessionGuard {
  canActivate(context) {
    const req = context.switchToHttp().getRequest();
    const role = req.headers['x-test-role'];
    if (!role) throw new UnauthorizedException('No session cookie');
    req.user = {
      id: req.headers['x-test-user-id'] || 'f10-actor',
      firebaseUid: 'stub-uid',
      email: 'req.headers-x@example.com'.replace('headers-x', role.toLowerCase()),
      displayName: 'F10 Check',
      role,
    };
    return true;
  }
}

class CheckModule {}

Module({
  controllers: [
    ShippingController,
    ProductsController,
    SuperAdminController,
    AuditController,
  ],
  providers: [
    PrismaService,
    AuditLogService,
    ShippingService,
    ProductsService,
    SuperAdminService,
  ],
})(CheckModule);

const results = [];
function assert(label, condition, detail) {
  results.push({ label, ok: Boolean(condition), detail });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

/** Every string anywhere in a payload, so a PII leak cannot hide in a nested key. */
function allStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(allStrings);
  return [];
}

function allKeys(value) {
  if (Array.isArray(value)) return value.flatMap(allKeys);
  if (value && typeof value === "object") {
    return [
      ...Object.keys(value),
      ...Object.values(value).flatMap(allKeys),
    ];
  }
  return [];
}

const PII_FIELDS = [
  'email',
  'displayName',
  'firebaseUid',
  'role',
  'userId',
  'user',
  'total',
  'subtotal',
  'tax',
  'currency',
  'price',
  'sku',
  'variantId',
  'productId',
  'product',
  'items',
];

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

  // Real rows, because the audit writer FKs to User and the projection reads
  // from Order: a customer who placed the order, and the shipping clerk who moves it.
  const customer = await prisma.user.create({
    data: {
      firebaseUid: `f10-customer-${STAMP}`,
      email: `f10-customer-${STAMP}@example.com`,
      displayName: 'Order Customer',
      role: 'USER',
    },
  });
  const clerk = await prisma.user.create({
    data: {
      firebaseUid: `f10-clerk-${STAMP}`,
      email: `f10-clerk-${STAMP}@example.com`,
      displayName: 'Shipping Clerk',
      role: 'SHIPPING',
    },
  });

  const as = (role, userId = clerk.id) => ({
    'x-test-role': role,
    'x-test-user-id': userId,
  });

  const order = await prisma.order.create({
    data: {
      userId: customer.id,
      status: 'PAID',
      subtotal: 40,
      tax: 4,
      total: 44,
      recipientName: 'F10 Check Recipient',
      recipientPhone: '+1 555 0100',
      shippingAddress: {
        line1: '1 Shipping Lane',
        city: 'Amman',
        postalCode: '11118',
        country: 'JO',
      },
    },
  });

  const shipment = await prisma.shipment.create({
    data: { orderId: order.id, status: 'ORDERED' },
  });

  try {
    // 1. a plain customer cannot reach the shipping surface; an ADMIN can, because
    //    the matrix grants ADMIN shipping.read/update (that is the "ADMIN with the
    //    shipping permission" case in the Phase 10 gate)
    const customerList = await request(server).get('/api/v1/shipments').set(as('USER', customer.id));
    assert('GET /shipments as USER is 403', customerList.status === 403, `got ${customerList.status}`);

    const customerUpdate = await request(server)
      .patch(`/api/v1/shipments/${shipment.id}`)
      .set(as('USER', customer.id))
      .send({ status: 'PROCESSING' });
    assert(
      'PATCH /shipments/:id as USER is 403',
      customerUpdate.status === 403,
      `got ${customerUpdate.status}`,
    );

    const adminList = await request(server).get('/api/v1/shipments').set(as('ADMIN'));
    assert(
      'GET /shipments as ADMIN is 200 (matrix grants shipping.read)',
      adminList.status === 200,
      `got ${adminList.status}`,
    );

    const anonymous = await request(server).get('/api/v1/shipments');
    assert('GET /shipments without a session is 401', anonymous.status === 401, `got ${anonymous.status}`);

    // 2. SHIPPING can read the desk
    const list = await request(server).get('/api/v1/shipments').set(as('SHIPPING'));
    assert('GET /shipments as SHIPPING is 200', list.status === 200, `got ${list.status}`);
    const row = list.body.find((s) => s.id === shipment.id);
    assert('the fixture shipment is listed', Boolean(row));

    // 3. the payload is a label and nothing more
    const leakedKeys = allKeys(list.body).filter((key) => PII_FIELDS.includes(key));
    assert(
      'the list carries no user, product or money fields',
      leakedKeys.length === 0,
      `leaked: ${[...new Set(leakedKeys)].join(', ') || 'none'}`,
    );

    const strings = allStrings(list.body);
    assert(
      "the customer's account data never leaves the database",
      !strings.includes(customer.email) && !strings.includes(customer.displayName) &&
        !strings.includes(customer.id) && !strings.includes(customer.firebaseUid),
    );
    assert(
      'the destination is present (a label without an address is useless)',
      row?.order?.recipientName === 'F10 Check Recipient' &&
        row?.order?.shippingAddress?.city === 'Amman' &&
        row?.order?.itemCount === 0,
      JSON.stringify(row?.order),
    );

    // 4. a SHIPPING session cannot reach the protected product mutations. The
    //    catalog lives at worlds/:worldId/products, so the paths are nested.
    const productRoot = `/api/v1/worlds/00000000-0000-0000-0000-000000000000/products`;
    for (const [method, path, body] of [
      ['post', productRoot, { title: 'Nope', slug: `f10-${STAMP}` }],
      ['patch', `${productRoot}/00000000-0000-0000-0000-000000000000`, { title: 'Nope' }],
      ['delete', `${productRoot}/00000000-0000-0000-0000-000000000000`, undefined],
    ]) {
      const call = request(server)[method](path).set(as('SHIPPING'));
      if (body) call.send(body);
      const res = await call;
      assert(
        `${method.toUpperCase()} worlds/:worldId/products as SHIPPING is 403`,
        res.status === 403,
        `got ${res.status}`,
      );
    }

    // ...while the catalog read stays public, because the storefront needs it
    const catalog = await request(server).get(productRoot);
    assert(
      'GET worlds/:worldId/products stays public (storefront dependency), not 403',
      catalog.status === 200,
      `got ${catalog.status}`,
    );

    // 5. and cannot reach the user directory either
    const users = await request(server).get('/api/v1/super-admin/users').set(as('SHIPPING'));
    assert('GET /super-admin/users as SHIPPING is 403', users.status === 403, `got ${users.status}`);

    // 6. the label details round-trip
    const saveLabel = await request(server)
      .patch(`/api/v1/shipments/${shipment.id}`)
      .set(as('SHIPPING'))
      .send({ carrier: 'DHL Express', trackingNumber: 'F10TRACK123' });
    assert('PATCH tracking/carrier as SHIPPING is 200', saveLabel.status === 200, `got ${saveLabel.status}`);
    assert(
      'carrier and tracking number are persisted and echoed',
      saveLabel.body?.carrier === 'DHL Express' && saveLabel.body?.trackingNumber === 'F10TRACK123',
    );

    // 7. the status advance is legal, immediately visible on the next read
    const advance = await request(server)
      .patch(`/api/v1/shipments/${shipment.id}`)
      .set(as('SHIPPING'))
      .send({ status: 'PROCESSING' });
    assert('PATCH status ORDERED → PROCESSING is 200', advance.status === 200, `got ${advance.status}`);
    assert('the response reflects the new status', advance.body?.status === 'PROCESSING');

    const reread = await request(server).get('/api/v1/shipments').set(as('SHIPPING'));
    const rereadRow = reread.body.find((s) => s.id === shipment.id);
    assert(
      'the new status is visible on the next read (what the UI invalidates)',
      rereadRow?.status === 'PROCESSING',
      `got ${rereadRow?.status}`,
    );
    assert(
      'a status-only update leaves the label details alone',
      rereadRow?.carrier === 'DHL Express' && rereadRow?.trackingNumber === 'F10TRACK123',
    );
    assert('the update response is the same narrow shape as the list', allKeys(advance.body).filter((k) => PII_FIELDS.includes(k)).length === 0);

    // Capture the real wire payloads so the frontend boundary schemas can be
    // validated against them: F10_CAPTURE=/tmp/x.json npm run check:f10
    if (process.env.F10_CAPTURE) {
      require('fs').writeFileSync(
        process.env.F10_CAPTURE,
        JSON.stringify({ list: list.body, trackingUpdate: saveLabel.body, statusUpdate: advance.body }, null, 2),
      );
    }

    // 8. the state machine is enforced server-side, not just hidden in the UI
    const skip = await request(server)
      .patch(`/api/v1/shipments/${shipment.id}`)
      .set(as('SHIPPING'))
      .send({ status: 'DELIVERED' });
    assert('PROCESSING → DELIVERED (skipping two steps) is 400', skip.status === 400, `got ${skip.status}`);

    const backwards = await request(server)
      .patch(`/api/v1/shipments/${shipment.id}`)
      .set(as('SHIPPING'))
      .send({ status: 'ORDERED' });
    assert('PROCESSING → ORDERED (reversal) is 400', backwards.status === 400, `got ${backwards.status}`);

    const empty = await request(server).patch(`/api/v1/shipments/${shipment.id}`).set(as('SHIPPING')).send({});
    assert('an empty PATCH is 400', empty.status === 400, `got ${empty.status}`);

    const unknown = await request(server)
      .patch(`/api/v1/shipments/${shipment.id}`)
      .set(as('SHIPPING'))
      .send({ status: 'LOST_IN_SPACE' });
    assert('an unknown status is 400', unknown.status === 400, `got ${unknown.status}`);

    const missing = await request(server)
      .patch('/api/v1/shipments/00000000-0000-0000-0000-000000000000')
      .set(as('SHIPPING'))
      .send({ status: 'SHIPPED' });
    assert('PATCHing an unknown shipment is 404', missing.status === 404, `got ${missing.status}`);

    // 9. the audit trail names the clerk, not the customer
    const audit = await request(server).get('/api/v1/admin/audit-log?page=1&pageSize=50').set(
      as('SUPER_ADMIN'),
    );
    const entries = (audit.body?.items ?? []).filter(
      (e) => e.action === 'shipment.updated' && e.entityId === shipment.id,
    );
    assert('both shipment edits are written to the audit log', entries.length === 2, `got ${entries.length}`);

    // Every one of them must name the clerk. Before the fix this was
    // `updated.order.userId` — i.e. the customer the parcel belongs to.
    assert(
      'every audit entry is attributed to the acting shipping user, not the customer',
      entries.length > 0 && entries.every((e) => e.actorUserId === clerk.id && e.actor?.email === clerk.email),
      entries.map((e) => `${e.actorUserId}/${e.actor?.email}`).join(' | '),
    );
    assert(
      'no shipment edit is attributed to the ordering customer',
      entries.every((e) => e.actorUserId !== customer.id),
    );

    const transition = entries.find((e) => e.metadata?.nextStatus === 'PROCESSING');
    assert(
      'the audit metadata records the transition it made',
      transition?.metadata?.previousStatus === 'ORDERED' && transition?.metadata?.trackingNumber === 'F10TRACK123',
      JSON.stringify(transition?.metadata),
    );
  } finally {
    await prisma.auditLog.deleteMany({ where: { entityId: shipment.id } });
    await prisma.shipment.deleteMany({ where: { id: shipment.id } });
    await prisma.order.deleteMany({ where: { id: order.id } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: [clerk.id, customer.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [clerk.id, customer.id] } } });
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
