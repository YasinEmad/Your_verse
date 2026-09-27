/**
 * B7 check — the cash-on-delivery order path.
 *
 * Two phases, because the claims under test live at two levels:
 *
 *   A. Services against the real database. This is where the guarantees are:
 *      one transaction across inventory/order/payment/cart, a forced mid-transaction
 *      failure that must leave *nothing* behind, idempotent checkout, delivery
 *      collecting the cash, and cancellation putting the stock back. A unit test
 *      with a mocked Prisma client would prove nothing here — "the rollback works"
 *      is a statement about Postgres, not about the shape of a mock.
 *
 *   B. The real HTTP surface (booted AppModule, session guard stubbed) for the
 *      things only the wire can show: a missing `Idempotency-Key` is a 400 with
 *      its own error code, `PATCH /orders/:id` is refused for a plain USER, the
 *      list is scoped per role, and the payload matches the documented schema.
 *
 * Fixtures are created and destroyed per run (nothing is read from the seed), and
 * every row is removed in foreign-key order at the end.
 *
 * Run: npm run check:b7   (requires `npm run build` first)
 */
require('dotenv/config');
require('reflect-metadata');

const { PrismaService } = require('../dist/prisma/prisma.service');
const { CartService } = require('../dist/modules/cart/cart.service');
const { OrdersService } = require('../dist/modules/orders/orders.service');
const { PaymentsService } = require('../dist/modules/payments/payments.service');
const { ShippingService } = require('../dist/modules/shipping/shipping.service');
const { AuditLogService } = require('../dist/modules/audit/audit.service');

const results = [];
function assert(label, condition, detail) {
  results.push({ label, ok: Boolean(condition) });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

function section(title) {
  console.log(`\n--- ${title}`);
}

/**
 * Wraps a Prisma client so `payment.create` inside a transaction throws.
 *
 * The sabotage has to land *after* the inventory decrement and *inside* the
 * transaction, which is the only way to prove the rollback is real: the decrement
 * is a genuine UPDATE that Postgres has already applied when the failure fires.
 * The transaction client Prisma hands to the callback is wrapped rather than
 * replaced, so every other call is the real one against the real database.
 */
function sabotagePaymentCreate(prisma) {
  const boobyTrapped = (model, method) =>
    new Proxy(model, {
      get(target, prop) {
        if (prop === method) {
          return async () => {
            throw new Error('ARTIFICIAL FAILURE after the inventory decrement');
          };
        }
        const value = target[prop];
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });

  const wrapTx = (tx) =>
    new Proxy(tx, {
      get(target, prop) {
        if (prop === 'payment') {
          return boobyTrapped(target.payment, 'create');
        }
        const value = target[prop];
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });

  return new Proxy(prisma, {
    get(target, prop) {
      if (prop === '$transaction') {
        return (arg, ...rest) => {
          if (typeof arg !== 'function') {
            return target.$transaction(arg, ...rest);
          }
          return target.$transaction((tx) => arg(wrapTx(tx)), ...rest);
        };
      }
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

(async () => {
  const prisma = new PrismaService();
  const audit = new AuditLogService(prisma);
  const payments = new PaymentsService(prisma, audit);
  const shipping = new ShippingService(prisma, audit, payments);
  const cart = new CartService(prisma);
  const orders = new OrdersService(prisma, cart, payments, shipping, audit);

  const stamp = Date.now();
  const ids = { users: [], orders: [], idempotencyKeys: [] };
  let worldId;
  let variantId;
  let inventoryId;

  const seedVariant = async (quantity) => {
    const world = await prisma.world.create({
      data: { slug: `b7-world-${stamp}`, name: 'B7 World', themeTokens: {} },
    });
    worldId = world.id;
    const category = await prisma.category.create({
      data: { worldId, slug: `b7-cat-${stamp}`, name: 'B7 Category' },
    });
    const product = await prisma.product.create({
      data: {
        worldId,
        categoryId: category.id,
        name: 'B7 Product',
        slug: `b7-product-${stamp}`,
        description: 'B7 fixture product',
        status: 'ACTIVE',
      },
    });
    const variant = await prisma.productVariant.create({
      data: { productId: product.id, sku: `B7-${stamp}`, attributes: {}, price: '10.00' },
    });
    const inventory = await prisma.inventory.create({
      data: { variantId: variant.id, quantity, reserved: 0 },
    });
    variantId = variant.id;
    inventoryId = inventory.id;
    return variant;
  };

  const makeUser = async (suffix) => {
    const user = await prisma.user.create({
      data: {
        firebaseUid: `b7-${suffix}-${stamp}`,
        email: `b7-${suffix}-${stamp}@example.test`,
        displayName: `B7 ${suffix}`,
        role: 'USER',
      },
    });
    ids.users.push(user.id);
    return user;
  };

  const fillCart = async (userId, lines) => {
    const created = await prisma.cart.create({ data: { userId } });
    for (const [variant, quantity] of lines) {
      await prisma.cartItem.create({
        data: { cartId: created.id, variantId: variant.id, quantity },
      });
    }
    return created;
  };

  const stockLeft = async () => (await prisma.inventory.findUnique({ where: { id: inventoryId } })).quantity;
  const orderCountFor = (userId) => prisma.order.count({ where: { userId } });
  const SEEDED_STOCK = 11;

  const customer = await makeUser('customer');
  const canceller = await makeUser('canceller');
  const shopper = await makeUser('shopper');
  const clerk = await makeUser('clerk');
  await prisma.user.update({ where: { id: clerk.id }, data: { role: 'SHIPPING' } });

  // 11 units: three orders of 2 across the scenarios below, two single-unit
  // orders for the key-expiry scenario, and headroom for the cancellation
  // scenario to still have stock on the shelf.
  const variant = await seedVariant(11);

  try {
    // ------------------------------------------------------------- checkout
    section('A1. checkout is one transaction');
    const cartRow = await fillCart(customer.id, [[variant, 2]]);
    const order = await orders.createOrder(customer.id, `b7-key-${stamp}-checkout`);

    assert('the order is PROCESSING — placed, not yet paid', order.status === 'PROCESSING', order.status);
    assert(
      'exactly one payment was created, PENDING, for the order total',
      order.payment?.status === 'PENDING' && order.payment.amount === 20,
      JSON.stringify(order.payment),
    );
    assert(
      'the payment records the only method the product has',
      order.payment?.provider === 'CASH_ON_DELIVERY',
      order.payment?.provider,
    );
    assert('stock is decremented by the ordered quantity', (await stockLeft()) === SEEDED_STOCK - 2, `left=${await stockLeft()}`);
    assert(
      'the cart is cleared',
      (await prisma.cart.count({ where: { userId: customer.id } })) === 0,
    );
    assert(
      'the order items snapshot price and world at checkout time',
      order.items.length === 1 &&
        order.items[0].unitPrice === 10 &&
        order.items[0].worldId === worldId &&
        order.items[0].quantity === 2,
      JSON.stringify(order.items[0]),
    );
    assert('money crosses the wire as a number, not a decimal string', typeof order.total === 'number', typeof order.total);
    assert('a shipment is opened so the order can actually be fulfilled', order.shipment?.status === 'ORDERED', order.shipment?.status);
    ids.orders.push(order.id);

    const createdAudit = await prisma.auditLog.findMany({
      where: { entityType: 'Order', entityId: order.id, action: 'order.created' },
    });
    assert('an AuditLog row exists for the order creation', createdAudit.length === 1, `rows=${createdAudit.length}`);

    // --------------------------------------------------------- idempotency
    section('A2. the same Idempotency-Key places one order');
    const replay = await orders.createOrder(customer.id, `b7-key-${stamp}-checkout`);
    assert('a replay returns the original order', replay.id === order.id, `${replay.id} vs ${order.id}`);
    assert('no second order exists', (await orderCountFor(customer.id)) === 1, `orders=${await orderCountFor(customer.id)}`);
    assert('a replay does not decrement stock again', (await stockLeft()) === SEEDED_STOCK - 2, `left=${await stockLeft()}`);

    let missingKeyError;
    try {
      await orders.createOrder(customer.id, undefined);
    } catch (error) {
      missingKeyError = error;
    }
    assert(
      'a checkout without an Idempotency-Key is refused with INVALID_IDEMPOTENCY_KEY',
      missingKeyError?.code === 'INVALID_IDEMPOTENCY_KEY',
      `${missingKeyError?.code}: ${missingKeyError?.message}`,
    );

    let shortKeyError;
    try {
      await orders.createOrder(customer.id, 'abc');
    } catch (error) {
      shortKeyError = error;
    }
    assert('a malformed key is refused too', shortKeyError?.code === 'INVALID_IDEMPOTENCY_KEY', shortKeyError?.code);

    // ------------------------------------------------------------- rollback
    section('A3. a failure after the decrement rolls everything back');
    const beforeStock = await stockLeft();
    // Counted, not asserted-to-be-zero: a shared development database is not
    // empty, and "the shipment table has exactly n rows" would then be testing
    // somebody else's fixtures instead of this rollback.
    const shipmentsBefore = await prisma.shipment.count();
    const doomedCart = await fillCart(customer.id, [[variant, 2]]);
    const doomedCartItems = await prisma.cartItem.count({ where: { cartId: doomedCart.id } });
    const doomedKey = `b7-key-${stamp}-rollback`;
    const sabotaged = new OrdersService(sabotagePaymentCreate(prisma), cart, payments, shipping, audit);

    let rollbackError;
    try {
      await sabotaged.createOrder(customer.id, doomedKey);
    } catch (error) {
      rollbackError = error;
    }

    assert('the checkout did fail', Boolean(rollbackError), rollbackError?.message);
    assert('no order row survived', (await orderCountFor(customer.id)) === 1, `orders=${await orderCountFor(customer.id)}`);
    assert('no payment row survived', (await prisma.payment.count({ where: { order: { userId: customer.id } } })) === 1);
    assert('stock is exactly as it was', (await stockLeft()) === beforeStock, `${beforeStock} -> ${await stockLeft()}`);
    assert(
      'the cart is intact, items included',
      (await prisma.cartItem.count({ where: { cartId: doomedCart.id } })) === doomedCartItems,
      `items=${await prisma.cartItem.count({ where: { cartId: doomedCart.id } })}`,
    );
    assert(
      'no shipment was opened for a rolled-back order',
      (await prisma.shipment.count()) === shipmentsBefore,
      `before=${shipmentsBefore} after=${await prisma.shipment.count()}`,
    );
    assert(
      'the failed attempt released its key, so the client may retry',
      (await prisma.idempotencyKey.count({ where: { key: doomedKey } })) === 0,
    );

    // the same key now succeeds, proving the release was real and not just a delete
  const retried = await orders.createOrder(customer.id, doomedKey);
  assert('retrying with the released key places the order', retried.status === 'PROCESSING', retried.status);
  ids.orders.push(retried.id);

    // ------------------------------------------------------------- delivery
    section('A4. delivery collects the cash');
    const delivered = await prisma.order.findUnique({
      where: { id: retried.id },
      include: { shipment: true },
    });
    for (const status of ['PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED']) {
      await shipping.updateShipmentStatus(delivered.shipment.id, { status }, { id: clerk.id });
    }

    const paid = await prisma.order.findUnique({
      where: { id: retried.id },
      include: { payment: true },
    });
    assert('the payment is PAID', paid.payment.status === 'PAID', paid.payment.status);
    assert('the order advanced to PAID', paid.status === 'PAID', paid.status);

    const paymentAudits = await prisma.auditLog.findMany({
      where: { action: 'payment.confirmed_on_delivery', entityId: paid.payment.id },
    });
    assert(
      'the confirmation is audited against the payment, attributed to the clerk',
      paymentAudits.length === 1 && paymentAudits[0].actorUserId === clerk.id,
      `rows=${paymentAudits.length} actor=${paymentAudits[0]?.actorUserId}`,
    );
    assert(
      'the audit row names the delivery that caused it',
      paymentAudits[0]?.metadata?.shipmentId === delivered.shipment.id &&
        paymentAudits[0]?.metadata?.method === 'CASH_ON_DELIVERY',
      JSON.stringify(paymentAudits[0]?.metadata),
    );

    // Re-saving a delivered row is normal dashboard behaviour and must be inert.
    await shipping.updateShipmentStatus(delivered.shipment.id, { carrier: 'DHL' }, { id: clerk.id });
    assert(
      're-saving a delivered shipment does not confirm the payment twice',
      (await prisma.auditLog.count({ where: { action: 'payment.confirmed_on_delivery', entityId: paid.payment.id } })) === 1,
    );

    let paidCancelError;
    try {
      await orders.updateOrder({ id: clerk.id, role: 'SHIPPING' }, retried.id, { status: 'CANCELLED' });
    } catch (error) {
      paidCancelError = error;
    }
    assert(
      'a paid order can no longer be cancelled',
      paidCancelError?.code === 'INVALID_STATE_TRANSITION',
      paidCancelError?.code,
    );

    // ---------------------------------------------------------- cancellation
    section('A5. cancellation restores stock and leaves the payment alone');
    await fillCart(canceller.id, [[variant, 2]]);
    const cancellable = await orders.createOrder(canceller.id, `b7-key-${stamp}-cancel`);
    ids.orders.push(cancellable.id);
    const stockBeforeCancel = await stockLeft();

    const cancelled = await orders.updateOrder(
      { id: clerk.id, role: 'SHIPPING' },
      cancellable.id,
      { status: 'CANCELLED' },
    );

    assert('the order is CANCELLED', cancelled.status === 'CANCELLED', cancelled.status);
    assert('every reserved unit is back on the shelf', (await stockLeft()) === stockBeforeCancel + 2, `${stockBeforeCancel} -> ${await stockLeft()}`);
    assert(
      'the payment row is untouched — nothing was ever charged to refund',
      cancelled.payment?.status === 'PENDING',
      cancelled.payment?.status,
    );
    assert(
      'the cancellation is audited against the admin who did it',
      (await prisma.auditLog.count({
        where: { action: 'order.cancelled', entityId: cancellable.id, actorUserId: clerk.id },
      })) === 1,
    );

    // ------------------------------------------------------------- expiry
    section('A6. a key is only a promise for 24 hours');
    // A key whose window has closed must not resurrect a day-old order to a
    // client that kept using it — that is what expiresAt is for. This is the
    // only way an expiry rule shows up as behaviour rather than a column.
    await fillCart(shopper.id, [[variant, 1]]);
    const expiredKey = `b7-key-${stamp}-expired`;
    const expiredOrder = await orders.createOrder(shopper.id, expiredKey);
    ids.orders.push(expiredOrder.id);
    await prisma.idempotencyKey.update({
      where: { scope_key: { scope: 'POST /orders', key: expiredKey } },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await fillCart(shopper.id, [[variant, 1]]);
    const afterExpiry = await orders.createOrder(shopper.id, expiredKey);
    ids.orders.push(afterExpiry.id);
    assert(
      'an expired key is reclaimed instead of replaying yesterday\'s order',
      afterExpiry.id !== expiredOrder.id,
      `first=${expiredOrder.id} second=${afterExpiry.id}`,
    );

    // --------------------------------------------------------------- scoping
    section('A7. reads are scoped by role');
    const customerActor = { id: customer.id, role: 'USER' };
    const clerkActor = { id: clerk.id, role: 'SHIPPING' };

    const own = await orders.listOrders(customerActor);
    assert('a customer sees only their own orders', own.every((row) => row.userId === customer.id), `rows=${own.length}`);

    const all = await orders.listOrders(clerkActor);
    assert(
      'shipping sees every order',
      all.length >= 3 && all.some((row) => row.userId === canceller.id),
      `rows=${all.length}`,
    );

    let crossRead;
    try {
      await orders.getOrder(customerActor, cancellable.id);
    } catch (error) {
      crossRead = error;
    }
    assert("another customer's order is a 404, not a 403", crossRead?.code === 'ORDER_NOT_FOUND', crossRead?.code);

    // ---------------------------------------------------------- HTTP surface
    section('B. the wire contract');
    await httpPhase();
  } catch (error) {
    console.error('\nUnexpected failure:', error);
    results.push({ label: 'the check ran to completion', ok: false });
  } finally {
    // Foreign keys are RESTRICT, so the order of these deletes is not negotiable.
    await prisma.idempotencyKey.deleteMany({ where: { scope: 'POST /orders', key: { contains: `b7-key-${stamp}` } } });
    // Audit rows are keyed by the entity they describe, and only some of those
    // entities are orders: `payment.confirmed_on_delivery` is keyed by payment
    // and `shipment.updated` by shipment. Deleting only order ids leaves those
    // rows behind forever, pointing at rows that no longer exist.
    const relatedIds = {
      payments: await prisma.payment.findMany({ where: { orderId: { in: ids.orders } }, select: { id: true } }),
      shipments: await prisma.shipment.findMany({ where: { orderId: { in: ids.orders } }, select: { id: true } }),
    };
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { entityId: { in: ids.orders } },
          { entityId: { in: relatedIds.payments.map((row) => row.id) } },
          { entityId: { in: relatedIds.shipments.map((row) => row.id) } },
          { actorUserId: { in: ids.users } },
        ],
      },
    });
    await prisma.payment.deleteMany({ where: { orderId: { in: ids.orders } } });
    await prisma.shipment.deleteMany({ where: { orderId: { in: ids.orders } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: ids.orders } } });
    await prisma.order.deleteMany({ where: { id: { in: ids.orders } } });
    await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: ids.users } } } });
    await prisma.cart.deleteMany({ where: { userId: { in: ids.users } } });
    await prisma.inventory.deleteMany({ where: { id: inventoryId } });
    await prisma.productVariant.deleteMany({ where: { id: variantId } });
    await prisma.product.deleteMany({ where: { slug: `b7-product-${stamp}` } });
    await prisma.category.deleteMany({ where: { slug: `b7-cat-${stamp}` } });
    await prisma.world.deleteMany({ where: { id: worldId } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.$disconnect();
  }

  const failed = results.filter((result) => !result.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.error(`FAILED: ${failed.map((result) => result.label).join(' | ')}`);
    process.exit(1);
  }
  process.exit(0);
})();

/**
 * The HTTP half: what only a booted app can show. The session guard is replaced
 * (a real one needs a browser-signed Firebase cookie) with the same
 * header-driven stand-in B10 uses, and every other layer is production wiring —
 * CSRF guard, exception filter, validation pipe, throttler included.
 */
async function httpPhase() {
  const { Test } = require('@nestjs/testing');
  const request = require('supertest');
  const { AppModule } = require('../dist/app.module');
  const { configureApp } = require('../dist/bootstrap');
  const { FirebaseSessionGuard } = require('../dist/common/guards/firebase-session.guard');
  const { orderSchema } = require('../dist/docs/response-schemas');
  const { PrismaService: HttpPrisma } = require('../dist/prisma/prisma.service');

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(FirebaseSessionGuard)
    .useValue({
      canActivate: (context) => {
        const req = context.switchToHttp().getRequest();
        if (!req.headers['x-test-role']) {
          return false;
        }
        req.user = {
          id: req.headers['x-test-user-id'],
          firebaseUid: 'stub',
          email: 'stub@example.test',
          displayName: null,
          role: req.headers['x-test-role'],
        };
        return true;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  const server = app.getHttpServer();
  const prisma = app.get(HttpPrisma);

  const CSRF = 'X-Requested-With';
  const csrf = ['yourverse'];
  const stamp = Date.now();
  const created = { orders: [], carts: [], users: [] };

  try {
    // Its own user, its own cart, its own single unit of stock. A cart is
    // resolved by user, so borrowing a seeded user's cart would make this check
    // depend on whatever else happens to be in it.
    const user = await prisma.user.create({
      data: {
        firebaseUid: `b7-http-${stamp}`,
        email: `b7-http-${stamp}@example.test`,
        role: 'USER',
      },
    });
    created.users.push(user.id);

    const world = await prisma.world.create({
      data: { slug: `b7-http-world-${stamp}`, name: 'B7 HTTP', themeTokens: {} },
    });
    const category = await prisma.category.create({
      data: { worldId: world.id, slug: `b7-http-cat-${stamp}`, name: 'B7 HTTP' },
    });
    const product = await prisma.product.create({
      data: {
        worldId: world.id,
        categoryId: category.id,
        name: 'B7 HTTP Product',
        slug: `b7-http-product-${stamp}`,
        description: 'B7 HTTP fixture',
        status: 'ACTIVE',
      },
    });
    const variant = await prisma.productVariant.create({
      data: { productId: product.id, sku: `B7-HTTP-${stamp}`, attributes: {}, price: '7.50' },
    });
    const inventory = await prisma.inventory.create({
      data: { variantId: variant.id, quantity: 2, reserved: 0 },
    });

    const cartRow = await prisma.cart.create({ data: { userId: user.id } });
    created.carts.push(cartRow.id);
    await prisma.cartItem.create({
      data: { cartId: cartRow.id, variantId: variant.id, quantity: 1 },
    });

    const asCustomer = { 'X-Test-Role': 'USER', 'X-Test-User-Id': user.id };
    const asShipping = { 'X-Test-Role': 'SHIPPING', 'X-Test-User-Id': user.id };

    const noKey = await request(server).post('/api/v1/orders').set(CSRF, csrf[0]).set(asCustomer);
    assert(
      'POST /orders without an Idempotency-Key is 400 INVALID_IDEMPOTENCY_KEY',
      noKey.status === 400 && noKey.body?.code === 'INVALID_IDEMPOTENCY_KEY',
      `status=${noKey.status} body=${JSON.stringify(noKey.body)}`,
    );

    const key = `b7-http-key-${stamp}`;
    const placed = await request(server)
      .post('/api/v1/orders')
      .set(CSRF, csrf[0])
      .set(asCustomer)
      .set('Idempotency-Key', key);
    const parsed = orderSchema.safeParse(placed.body);
    assert(
      'POST /orders with a key returns 201 and a documented order',
      placed.status === 201 && parsed.success,
      `status=${placed.status}${parsed.success ? '' : ` — ${parsed.error.issues.slice(0, 2).map((i) => i.path.join('.')).join('; ')}`}`,
    );
    assert('money arrives as a number, not a decimal string', typeof placed.body?.total === 'number', typeof placed.body?.total);

    const orderId = placed.body?.id;
    created.orders.push(orderId);

    // Cash on delivery has exactly one way in. The B7 decision is to have no
    // pay endpoint at all — not a disabled one, not one behind a role — so the
    // thing being tested here is the route's absence.
    const payRoute = await request(server)
      .post(`/api/v1/orders/${orderId}/pay`)
      .set(CSRF, csrf[0])
      .set(asCustomer)
      .send({ provider: 'cash_on_delivery', providerRef: 'b7-should-not-happen', amount: 10 });
    assert('no manual payment route is exposed', payRoute.status === 404, `POST /orders/:id/pay → ${payRoute.status}`);

    const webhookRoute = await request(server)
      .post('/api/v1/payments/webhook')
      .set(CSRF, csrf[0])
      .set(asCustomer)
      .send({ provider: 'cash_on_delivery' });
    assert('no payment webhook is exposed', webhookRoute.status === 404, `POST /payments/webhook → ${webhookRoute.status}`);

    const replayed = await request(server)
      .post('/api/v1/orders')
      .set(CSRF, csrf[0])
      .set(asCustomer)
      .set('Idempotency-Key', key);
    assert(
      'the replayed request returns the same order over HTTP',
      replayed.status === 201 && replayed.body?.id === orderId,
      `status=${replayed.status} id=${replayed.body?.id}`,
    );
    assert(
      'and created no second order',
      (await prisma.order.count({ where: { userId: user.id } })) === 1,
    );

    const customerPatch = await request(server)
      .patch(`/api/v1/orders/${orderId}`)
      .set(CSRF, csrf[0])
      .set(asCustomer)
      .send({ status: 'CANCELLED' });
    assert(
      'a plain USER cannot cancel an order (no orders.update)',
      customerPatch.status === 403,
      `status=${customerPatch.status}`,
    );

    const badStatus = await request(server)
      .patch(`/api/v1/orders/${orderId}`)
      .set(CSRF, csrf[0])
      .set(asShipping)
      .send({ status: 'PAID' });
    assert(
      'a client cannot mark an order PAID — only delivery can',
      badStatus.status === 400 && badStatus.body?.code === 'VALIDATION_FAILED',
      `status=${badStatus.status} code=${badStatus.body?.code}`,
    );

    const shippingPatch = await request(server)
      .patch(`/api/v1/orders/${orderId}`)
      .set(CSRF, csrf[0])
      .set(asShipping)
      .send({ status: 'CANCELLED' });
    assert(
      'SHIPPING can cancel it',
      shippingPatch.status === 200 && shippingPatch.body?.status === 'CANCELLED',
      `status=${shippingPatch.status} body=${JSON.stringify(shippingPatch.body).slice(0, 120)}`,
    );
    assert(
      'and the cancelled order kept its payment row at PENDING',
      shippingPatch.body?.payment?.status === 'PENDING',
      shippingPatch.body?.payment?.status,
    );
    // The HTTP order took one unit off a shelf of two; cancelling puts it back.
    const afterCancel = await prisma.inventory.findUnique({ where: { id: inventory.id } });
    assert('cancelling put the unit back on the shelf', afterCancel.quantity === 2, `left=${afterCancel.quantity}`);

    const list = await request(server).get('/api/v1/orders').set(asCustomer);
    assert(
      'GET /orders is a bare array of documented orders',
      list.status === 200 &&
        Array.isArray(list.body) &&
        list.body.every((row) => orderSchema.safeParse(row).success),
      `status=${list.status} rows=${Array.isArray(list.body) ? list.body.length : 'n/a'}`,
    );
  } finally {
    for (const orderId of created.orders) {
      const paymentIds = await prisma.payment.findMany({ where: { orderId }, select: { id: true } });
      const shipmentIds = await prisma.shipment.findMany({ where: { orderId }, select: { id: true } });
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.shipment.deleteMany({ where: { orderId } });
      await prisma.payment.deleteMany({ where: { orderId } });
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { entityId: orderId },
            { entityId: { in: paymentIds.map((row) => row.id) } },
            { entityId: { in: shipmentIds.map((row) => row.id) } },
            { actorUserId: { in: created.users } },
          ],
        },
      });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    await prisma.idempotencyKey.deleteMany({ where: { key: { contains: 'b7-http-key-' } } });
    for (const cartId of created.carts) {
      await prisma.cartItem.deleteMany({ where: { cartId } });
    }
    await prisma.cart.deleteMany({ where: { id: { in: created.carts } } });
    await prisma.inventory.deleteMany({ where: { variant: { sku: { contains: `B7-HTTP-` } } } });
    // Belt and braces: anything this phase created but did not manage to track
    // (an assertion throwing between the order and the push) still has to go,
    // or the next run cannot delete the variant and fails on a foreign key.
    await prisma.orderItem.deleteMany({ where: { variant: { sku: { contains: `B7-HTTP-` } } } });
    await prisma.shipment.deleteMany({ where: { order: { items: { some: { variant: { sku: { contains: `B7-HTTP-` } } } } } } });
    await prisma.payment.deleteMany({ where: { order: { items: { some: { variant: { sku: { contains: `B7-HTTP-` } } } } } } });
    await prisma.order.deleteMany({ where: { items: { some: { variant: { sku: { contains: `B7-HTTP-` } } } } } });
    await prisma.productVariant.deleteMany({ where: { sku: { contains: `B7-HTTP-` } } });
    await prisma.product.deleteMany({ where: { slug: { contains: 'b7-http-product-' } } });
    await prisma.category.deleteMany({ where: { slug: { contains: 'b7-http-cat-' } } });
    await prisma.world.deleteMany({ where: { slug: { contains: 'b7-http-world-' } } });
    await prisma.user.deleteMany({ where: { id: { in: created.users } } });
    await app.close();
  }
}
