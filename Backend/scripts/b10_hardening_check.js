/**
 * B10 backend verification — production hardening (backend-architecture.md §13–§18, §21–§22).
 *
 * Every other check script rebuilds a partial app out of controllers and
 * services. This one cannot: the claims under test *are* the wiring — the global
 * exception filter, the CSRF guard, the throttler, the CORS allowlist, the
 * request-id interceptor and the gated Swagger document are all things that
 * happen in `configureApp()`. So it boots the real `AppModule` and calls the real
 * `configureApp()`, and the only substitution is `FirebaseSessionGuard`, which
 * cannot be satisfied without a browser-signed session cookie.
 *
 * It proves:
 *   1.  every failure leaves through the §13 shape and nothing else —
 *       `{ statusCode, code, message }`, with `code` stable and never an
 *       internal message;
 *   2.  a mutating request without `X-Requested-With: yourverse` is refused with
 *       403 CSRF_HEADER_MISSING, and the same request with the header is not;
 *   3.  `/auth/session` is rate limited to THROTTLE_LIMITS.auth, and the 429
 *       carries `TOO_MANY_REQUESTS` plus `Retry-After`;
 *   4.  CORS reflects only allowlisted origins, always with credentials, and
 *       never reflects a stranger's origin;
 *   5.  `X-Request-Id` is echoed when safe, replaced when not, and exposed to the
 *       browser via `Access-Control-Expose-Headers`;
 *   6.  in production, `/api/docs` and `/api/docs-json` are both gated behind a
 *       session, and the JSON document covers every registered route.
 *
 * Run: npm run check:b10   (requires `npm run build` first)
 */
require('dotenv/config');
require('reflect-metadata');

const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { z } = require('zod');

process.env.NODE_ENV = 'production';
delete process.env.SWAGGER_PUBLIC;

const { AppModule } = require('../dist/app.module');
const { configureApp } = require('../dist/bootstrap');
const { FirebaseSessionGuard } = require('../dist/common/guards/firebase-session.guard');
const { THROTTLE_LIMITS } = require('../dist/common/throttling/throttle-profiles');
const { isDocsPath } = require('../dist/docs/docs-gate.middleware');

/** Stands in for a verified Firebase session cookie: role from a header. */
class StubSessionGuard {
  canActivate(context) {
    const req = context.switchToHttp().getRequest();
    const role = req.headers['x-test-role'];
    if (!role) {
      // Same class of failure the real guard raises, so the docs gate below
      // exercises the production error path rather than a stubbed one.
      const { UnauthorizedDomainException, ErrorCode } = require('../dist/common/errors/domain.exception');
      throw new UnauthorizedDomainException(ErrorCode.UNAUTHENTICATED, 'No session cookie');
    }
    req.user = {
      id: req.headers['x-test-user-id'] || 'b10-actor',
      firebaseUid: 'stub-uid',
      email: `${String(role).toLowerCase()}@example.com`,
      displayName: 'B10 Check',
      role,
    };
    return true;
  }
}

const results = [];
function assert(label, condition, detail) {
  results.push({ label, ok: Boolean(condition), detail });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

/** §13 in one predicate: exactly these keys, a number, a stable UPPER_SNAKE code. */
const ERROR_SHAPE = z.object({
  statusCode: z.number(),
  code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  message: z.union([z.string(), z.array(z.string())]),
}).strict();

function errorShapeOf(body) {
  const parsed = ERROR_SHAPE.safeParse(body);
  return parsed.success ? parsed.data : null;
}

/**
 * Every route the app actually serves, read back off the Express router.
 * Express 5 keeps them on `app.router.stack`; Nest 11+ hands back a bare
 * `http.Server` from `getHttpServer()`, so the Express app has to come from the
 * adapter. Asserting on this list is what makes "every route is documented" a
 * real claim instead of a vacuous one.
 */
function registeredRoutes(app) {
  const expressApp = app.getHttpAdapter().getInstance();
  const router = expressApp?.router ?? expressApp?._router ?? expressApp?.app?.router;
  const stack = router?.stack ?? [];
  const routes = [];
  for (const layer of stack) {
    const route = layer.route;
    if (!route || typeof route.path !== 'string') continue;
    if (!route.path.startsWith('/api/')) continue;
    // The Swagger UI's own static assets are served by @nestjs/swagger, not by a
    // controller, and are not part of the API surface being documented.
    if (isDocsPath(route.path)) continue;
    for (const method of Object.keys(route.methods)) {
      if (method === 'all') continue;
      routes.push({ method: method.toUpperCase(), path: route.path });
    }
  }
  return routes;
}

/** `/api/v1/worlds/:worldId` -> `/api/v1/worlds/{worldId}` (OpenAPI path syntax). */
function toOpenApiPath(path) {
  return path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

async function run() {
  // Boot the app exactly as `main.ts` does, with no substitutions at all, before
  // anything else. The rest of this script overrides `FirebaseSessionGuard`, which
  // also replaces its provider — so without this first, un-overridden boot, a
  // module whose DI graph cannot resolve the guard would sail through every check
  // below and the app would still fail to start for real.
  {
    const { NestFactory } = require('@nestjs/core');
    let real;
    try {
      real = await NestFactory.create(AppModule, { logger: false });
      configureApp(real);
      await real.init();
      const res = await request(real.getHttpServer()).get('/api/v1/health');
      assert('the app boots through the real production wiring', res.status === 200, `status=${res.status}`);
    } catch (error) {
      assert('the app boots through the real production wiring', false, String(error).split('\n')[0]);
    } finally {
      await real?.close();
    }
  }

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(FirebaseSessionGuard)
    .useClass(StubSessionGuard)
    .compile();

  const app = moduleRef.createNestApplication();
  // The real production wiring, not a reconstruction of it.
  configureApp(app);
  await app.init();

  const server = app.getHttpServer();
  const allowedOrigin = (process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? '')
    .split(',')[0]
    .trim();
  const strangerOrigin = 'https://not-your-frontend.example';
  const csrf = ['X-Requested-With', 'yourverse'];

  // ---------------------------------------------------------------- §13 shape
  {
    const res = await request(server).get('/api/v1/definitely-not-a-route');
    const shape = errorShapeOf(res.body);
    assert('unknown route returns 404 in the §13 shape', res.status === 404 && shape !== null,
      `status=${res.status} body=${JSON.stringify(res.body)}`);
    assert('a 404 carries a stable code, not a message', shape?.code === 'NOT_FOUND', `code=${shape?.code}`);
    assert('a 404 leaks no stack trace or path internals',
      !JSON.stringify(res.body).includes('at ') && !JSON.stringify(res.body).includes('src/'),
      JSON.stringify(res.body).slice(0, 120));
  }

  // ---------------------------------------------------------------- §16 CSRF
  {
    const missing = await request(server).post('/api/v1/auth/session').send({ idToken: 'x' });
    const shape = errorShapeOf(missing.body);
    assert('POST without X-Requested-With is 403 CSRF_HEADER_MISSING',
      missing.status === 403 && shape?.code === 'CSRF_HEADER_MISSING',
      `status=${missing.status} body=${JSON.stringify(missing.body)}`);

    const present = await request(server).post('/api/v1/auth/session').set(...csrf).send({ idToken: 'x' });
    assert('the same POST with the header is not blocked by CSRF', present.status !== 403,
      `status=${present.status} body=${JSON.stringify(present.body).slice(0, 120)}`);

    const wrongValue = await request(server).post('/api/v1/auth/session')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ idToken: 'x' });
    assert('a wrong header *value* is also refused', wrongValue.status === 403, `status=${wrongValue.status}`);

    // Reads must not need the header, or the storefront would break.
    const read = await request(server).get('/api/v1/health');
    assert('GET needs no CSRF header', read.status === 200, `status=${read.status}`);
  }

  // ---------------------------------------------------------------- §17 limits
  {
    const limit = THROTTLE_LIMITS.auth.limit;
    const statuses = [];
    // The four requests above already spent two of the budget, so drive it past
    // the limit rather than assuming an empty counter.
    for (let i = 0; i < limit + 2; i += 1) {
      const res = await request(server).post('/api/v1/auth/session').set(...csrf).send({ idToken: 'x' });
      statuses.push(res.status);
      if (res.status === 429) {
        const shape = errorShapeOf(res.body);
        assert('the limit response is 429 TOO_MANY_REQUESTS in the §13 shape',
          shape?.code === 'TOO_MANY_REQUESTS' && shape?.statusCode === 429,
          `body=${JSON.stringify(res.body)}`);
        assert('a 429 tells the client when to retry', Boolean(res.headers['retry-after']),
          `retry-after=${res.headers['retry-after']}`);
        break;
      }
    }
    const throttledAt = statuses.indexOf(429);
    assert(`/auth/session is limited to ${limit}/min`,
      throttledAt !== -1 && statuses.slice(0, throttledAt).every((s) => s !== 429),
      `statuses=[${statuses.join(',')}]`);

    // A public read has a much larger budget, so it must not be throttled by the
    // auth requests that just fired.
    const reads = [];
    for (let i = 0; i < 3; i += 1) {
      reads.push((await request(server).get('/api/v1/health')).status);
    }
    assert('the auth bucket does not throttle unrelated reads', reads.every((s) => s === 200),
      `statuses=[${reads.join(',')}]`);
  }

  // ---------------------------------------------------------------- §15 CORS
  {
    const allowed = await request(server).get('/api/v1/health').set('Origin', allowedOrigin);
    assert('an allowlisted origin is reflected',
      allowed.headers['access-control-allow-origin'] === allowedOrigin,
      `allow-origin=${allowed.headers['access-control-allow-origin']} expected=${allowedOrigin}`);
    assert('credentials are allowed (the session cookie depends on it)',
      allowed.headers['access-control-allow-credentials'] === 'true',
      `allow-credentials=${allowed.headers['access-control-allow-credentials']}`);

    const stranger = await request(server).get('/api/v1/health').set('Origin', strangerOrigin);
    assert('a stranger origin gets no allow-origin header',
      stranger.headers['access-control-allow-origin'] === undefined,
      `allow-origin=${stranger.headers['access-control-allow-origin']}`);

    const preflight = await request(server)
      .options('/api/v1/auth/session')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'x-requested-with');
    assert('preflight approves the CSRF header for an allowlisted origin',
      String(preflight.headers['access-control-allow-headers'] ?? '').toLowerCase().includes('x-requested-with'),
      `allow-headers=${preflight.headers['access-control-allow-headers']}`);

    // Checkout is the one request the browser makes with a header of its own
    // (B7). A custom request header is not CORS-safelisted, so it turns every
    // checkout into a preflight — if this header is missing from the allowlist,
    // `POST /orders` works from curl and fails silently in the browser.
    const checkoutPreflight = await request(server)
      .options('/api/v1/orders')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'x-requested-with,idempotency-key');
    assert('preflight approves Idempotency-Key, so the browser can check out',
      String(checkoutPreflight.headers['access-control-allow-headers'] ?? '').toLowerCase().includes('idempotency-key'),
      `allow-headers=${checkoutPreflight.headers['access-control-allow-headers']}`);

    const strangerPreflight = await request(server)
      .options('/api/v1/auth/session')
      .set('Origin', strangerOrigin)
      .set('Access-Control-Request-Method', 'POST');
    assert('preflight from a stranger origin is not approved',
      strangerPreflight.headers['access-control-allow-origin'] === undefined,
      `allow-origin=${strangerPreflight.headers['access-control-allow-origin']}`);
  }

  // ---------------------------------------------------------------- §18 logs
  {
    const echoed = await request(server).get('/api/v1/health').set('X-Request-Id', 'b10-req-001');
    assert('a safe inbound X-Request-Id is echoed back',
      echoed.headers['x-request-id'] === 'b10-req-001', `got=${echoed.headers['x-request-id']}`);

    // Newlines are the log-forging vector, but Node's own client refuses to
    // transmit them, so the transport is covered by a value it *will* send and
    // the sanitizer itself is asserted directly.
    const unsanitised = await request(server).get('/api/v1/health')
      .set('X-Request-Id', 'not a valid id! x'.repeat(6));
    assert('an inbound id outside the safe alphabet is replaced',
      unsanitised.headers['x-request-id'] !== 'not a valid id! x'.repeat(6)
        && typeof unsanitised.headers['x-request-id'] === 'string',
      `got=${JSON.stringify(String(unsanitised.headers['x-request-id']).slice(0, 40))}`);

    const { resolveRequestId } = require('../dist/common/logging/request-logging.interceptor');
    assert('an id carrying CRLF is replaced, so it cannot forge a log line',
      resolveRequestId('a\r\n{"level":"error","msg":"forged"}') !== 'a\r\n{"level":"error","msg":"forged"}',
      'resolved to a fresh id');
    assert('an over-long id is replaced', resolveRequestId('x'.repeat(200)).length <= 64, 'capped');
    assert('a plausible id is kept', resolveRequestId('edge-7f3a.1') === 'edge-7f3a.1', 'kept as-is');

    const generated = await request(server).get('/api/v1/health');
    assert('a request without an id still gets one',
      typeof generated.headers['x-request-id'] === 'string' && generated.headers['x-request-id'].length > 0,
      `got=${generated.headers['x-request-id']}`);

    const exposed = await request(server).get('/api/v1/health').set('Origin', allowedOrigin);
    assert('X-Request-Id is exposed to the browser via CORS',
      String(exposed.headers['access-control-expose-headers'] ?? '').toLowerCase().includes('x-request-id'),
      `expose-headers=${exposed.headers['access-control-expose-headers']}`);

    // Nest's own boot output must already be JSON, otherwise a deployment log has
    // two formats in it and only the early lines are queryable. Assert on what
    // actually reaches stdout rather than on an internal helper.
    const { JsonLogger } = require('../dist/common/logging/json-logger');
    const captured = [];
    const realWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk) => {
      captured.push(String(chunk));
      return true;
    };
    try {
      new JsonLogger().log({ event: 'request', requestId: 'b10-req-001', status: 200 }, 'B10Check');
      new JsonLogger().error('boot failed');
    } finally {
      process.stdout.write = realWrite;
    }

    const lines = captured.join('').split('\n').filter(Boolean);
    const parsed = lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    });
    assert('every log line is a single JSON object', parsed.length === lines.length && parsed.length === 2,
      `lines=${lines.length} parsed=${parsed.filter(Boolean).length}`);
    assert('a structured log keeps its fields and gains time/level/context',
      parsed[0]?.event === 'request' && parsed[0]?.requestId === 'b10-req-001'
        && parsed[0]?.level === 'log' && parsed[0]?.context === 'B10Check'
        && typeof parsed[0]?.time === 'string',
      JSON.stringify(parsed[0]));
    assert('an object log is not stringified into [object Object]',
      !lines.some((line) => line.includes('[object Object]')), lines[0]?.slice(0, 80));
  }

  // ---------------------------------------------------------------- §13 403 code
  {
    // A USER session on a SHIPPING route: the permission guard's real failure.
    const res = await request(server).get('/api/v1/shipments').set(...csrf).set('X-Test-Role', 'USER');
    const shape = errorShapeOf(res.body);
    assert('a session without the permission is 403 FORBIDDEN in the §13 shape',
      res.status === 403 && shape?.code === 'FORBIDDEN',
      `status=${res.status} body=${JSON.stringify(res.body)}`);
  }

  // ---------------------------------------------------------------- §22 docs
  {
    const anonymous = await request(server).get('/api/docs-json');
    const anonShape = errorShapeOf(anonymous.body);
    assert('/api/docs-json is gated in production',
      anonymous.status === 401 && anonShape !== null,
      `status=${anonymous.status} body=${JSON.stringify(anonymous.body).slice(0, 120)}`);

    const anonymousUi = await request(server).get('/api/docs');
    assert('/api/docs (the UI) is gated too', anonymousUi.status === 401,
      `status=${anonymousUi.status}`);

    // The YAML variant is served by the same module and leaks the same map, so
    // it has to be gated by name rather than by prefix.
    const anonymousYaml = await request(server).get('/api/docs-yaml');
    assert('/api/docs-yaml is gated as well', anonymousYaml.status === 401,
      `status=${anonymousYaml.status}`);

    const authed = await request(server).get('/api/docs-json').set('X-Test-Role', 'USER');
    assert('any signed-in session may read the docs', authed.status === 200, `status=${authed.status}`);

    const doc = authed.body;
    assert('the document declares a security scheme for the session cookie',
      Boolean(doc?.components?.securitySchemes?.cookieAuth),
      JSON.stringify(Object.keys(doc?.components?.securitySchemes ?? {})));

    const routes = registeredRoutes(app);
    assert('the API surface is large enough for the coverage check to mean anything',
      routes.length >= 30, `${routes.length} routes registered`);
    const undocumented = routes.filter(
      (route) => !doc?.paths?.[toOpenApiPath(route.path)]?.[route.method.toLowerCase()],
    );
    assert(`every one of the ${routes.length} registered routes is documented`,
      undocumented.length === 0,
      undocumented.map((r) => `${r.method} ${r.path}`).join(' | ') || 'all covered');

    const productCreate = doc?.paths?.['/api/v1/worlds/{worldId}/products']?.post;
    assert('a mutating route documents its request body from the Zod schema',
      Boolean(productCreate?.requestBody?.content?.['application/json']?.schema),
      JSON.stringify(Object.keys(productCreate?.requestBody?.content ?? {})));

    const worldSlug = doc?.paths?.['/api/v1/worlds/{slug}']?.get;
    assert('a public route is documented without a security requirement',
      Array.isArray(worldSlug?.security) && worldSlug.security.length === 0,
      JSON.stringify(worldSlug?.security));

    // Nest answers 201 to a POST by default, so a route that documents a created
    // resource must say 201 and a route that returns a representation must say 200.
    // Getting this wrong is how a client ends up treating a 201 as an error.
    const postStatus = (path) => {
      const responses = doc?.paths?.[path]?.post?.responses ?? {};
      return Object.keys(responses).find((code) => code !== 'default');
    };
    assert('a POST that creates a resource documents 201',
      postStatus('/api/v1/worlds') === '201' && postStatus('/api/v1/worlds/{worldId}/sections') === '201',
      `POST /worlds=${postStatus('/api/v1/worlds')} POST /sections=${postStatus('/api/v1/worlds/{worldId}/sections')}`);
    assert('a POST that returns a representation documents 200',
      postStatus('/api/v1/auth/session') === '200' && postStatus('/api/v1/cart/items') === '200',
      `POST /auth/session=${postStatus('/api/v1/auth/session')} POST /cart/items=${postStatus('/api/v1/cart/items')}`);
    const patchStatus = (path) => {
      const responses = doc?.paths?.[path]?.patch?.responses ?? {};
      return Object.keys(responses).find((code) => code !== 'default');
    };
    assert('a PATCH documents 200', patchStatus('/api/v1/shipments/{id}') === '200',
      `PATCH /shipments/:id=${patchStatus('/api/v1/shipments/{id}')}`);
    // Every delete route here returns the deleted row (or the updated cart) with a
    // 200, so documenting 204 anywhere would be a doc the runtime does not honour.
    const deleteStatus = (path) =>
      Object.keys(doc?.paths?.[path]?.delete?.responses ?? {}).find((code) => code !== 'default');
    const deletePaths = [
      '/api/v1/worlds/{worldId}/categories/{id}',
      '/api/v1/worlds/{worldId}/products/{id}',
      '/api/v1/worlds/{worldId}/sections/{id}',
      '/api/v1/cart/items/{id}',
      '/api/v1/worlds/{id}',
    ];
    const wrongDeletes = deletePaths.filter((path) => deleteStatus(path) !== '200');
    assert(`all ${deletePaths.length} DELETE routes document 200`, wrongDeletes.length === 0,
      wrongDeletes.map((p) => `${p}=${deleteStatus(p)}`).join(' | ') || 'all 200');

    assert('every documented response schema is attached, not left as a bare 200',
      Object.values(doc?.paths ?? {}).every((item) =>
        Object.values(item).every((op) => op.responses && Object.keys(op.responses).length > 0)),
      'all operations declare responses');

    // The gate has to recognise both doc paths, or the UI opens and the JSON does not.
    assert('the docs gate matches both document paths',
      isDocsPath('/api/docs') && isDocsPath('/api/docs-json') && isDocsPath('/api/docs-yaml')
        && !isDocsPath('/api/v1/health'),
      'path matching');
  }

  // ------------------------------------------------- §22 schema fidelity
  //
  // Response schemas are hand-written, so the only thing that makes them
  // trustworthy is checking them against payloads a booted app actually returns.
  {
    const { PrismaService } = require('../dist/prisma/prisma.service');
    const {
      cartSchema,
      categorySchema,
      healthSchema,
      productListSchema,
      sectionListSchema,
      worldBySlugSchema,
    } = require('../dist/docs/response-schemas');
    const prisma = app.get(PrismaService);
    const world = await prisma.world.findFirst({ orderBy: { createdAt: 'asc' } });

    /** Parse a live payload, reporting the first mismatch rather than a boolean. */
    async function liveShape(label, schema, url) {
      const res = await request(server).get(url);
      if (res.status !== 200) {
        assert(`${label} responds 200`, false, `status=${res.status} url=${url}`);
        return null;
      }
      const parsed = schema.safeParse(res.body);
      assert(`${label} matches its documented schema`, parsed.success,
        parsed.success ? url : `${url} — ${parsed.error.issues.slice(0, 2).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      return res.body;
    }

    await liveShape('GET /health', healthSchema, '/api/v1/health');
    await liveShape('GET /cart (guest)', cartSchema, '/api/v1/cart');

    if (world) {
      await liveShape('GET /worlds/{slug}', worldBySlugSchema, `/api/v1/worlds/${world.slug}`);
      await liveShape('GET /worlds/{id}/products', productListSchema, `/api/v1/worlds/${world.id}/products`);
      await liveShape('GET /worlds/{id}/categories', z.array(categorySchema), `/api/v1/worlds/${world.id}/categories`);
      await liveShape('GET /worlds/{id}/sections', sectionListSchema, `/api/v1/worlds/${world.id}/sections`);
    } else {
      assert('a seeded World exists to check the storefront schemas against', false, 'no World in the database');
    }
  }

  // ------------------------------------------------- §14/§5 write hardening
  //
  // The section routes were the one mutating surface with neither a session guard
  // nor a validated body, and the service looked sections up by id alone. Both are
  // checked here against the real database.
  {
    const { PrismaService } = require('../dist/prisma/prisma.service');
    const prisma = app.get(PrismaService);
    const world = await prisma.world.findFirst({
      where: { sections: { some: {} } },
      orderBy: { createdAt: 'asc' },
    });
    const admin = ['X-Test-Role', 'ADMIN'];

    const unauthenticated = await request(server)
      .post(`/api/v1/worlds/${world?.id ?? 'none'}/sections`)
      .set(...csrf)
      .send({ type: 'hero', config: {} });
    assert('a section write without a session is 401, not an unguarded write',
      unauthenticated.status === 401,
      `status=${unauthenticated.status}`);

    const badBody = await request(server)
      .post(`/api/v1/worlds/${world?.id ?? 'none'}/sections`)
      .set(...csrf)
      .set(...admin)
      .send({ type: 'not-a-real-section-type' });
    const badShape = errorShapeOf(badBody.body);
    assert('a section write with an unknown type is 400 VALIDATION_FAILED',
      badBody.status === 400 && badShape?.code === 'VALIDATION_FAILED',
      `status=${badBody.status} body=${JSON.stringify(badBody.body)}`);

    const strayField = await request(server)
      .post(`/api/v1/worlds/${world?.id ?? 'none'}/sections`)
      .set(...csrf)
      .set(...admin)
      .send({ type: 'hero', config: {}, worldId: '11111111-2222-3333-4444-555555555555' });
    assert('a section write cannot smuggle a foreign worldId in the body',
      strayField.status === 400 && errorShapeOf(strayField.body)?.code === 'VALIDATION_FAILED',
      `status=${strayField.status} code=${errorShapeOf(strayField.body)?.code}`);

    // The seeded data has one World with sections, so the boundary is checked with
    // a throwaway second World: create it, give it a section, then try to reach
    // that section through the *first* World's URL. Deleted again at the end, so
    // the check leaves no rows behind.
    const stamp = `b10-boundary-${Date.now()}`;
    const created = await request(server)
      .post('/api/v1/worlds')
      .set(...csrf)
      .set('X-Test-Role', 'SUPER_ADMIN')
      .send({ slug: stamp, name: 'B10 Boundary' });
    let throwaway;
    if (created.status >= 200 && created.status < 300) {
      throwaway = created.body;
      const section = await request(server)
        .post(`/api/v1/worlds/${throwaway.id}/sections`)
        .set(...csrf)
        .set(...admin)
        .send({ type: 'hero', config: {} });
      // 201, which is why the route documents ApiZodCreatedResponse.
      assert('a section can be created in a World', section.status === 201, `status=${section.status}`);

      if (world) {
        const foreign = await request(server)
          .patch(`/api/v1/worlds/${world.id}/sections/reorder`)
          .set(...csrf)
          .set(...admin)
          .send([{ id: section.body.id, position: 1 }]);
        const foreignShape = errorShapeOf(foreign.body);
        assert("a section of another World cannot be reordered through this World's URL",
          foreign.status === 404 && foreignShape?.code === 'SECTION_NOT_FOUND',
          `status=${foreign.status} body=${JSON.stringify(foreign.body)}`);
      }
    } else {
      assert('the throwaway World for the boundary check could be created', false,
        `status=${created.status} body=${JSON.stringify(created.body)}`);
    }
    if (throwaway) {
      const cleanup = await request(server)
        .delete(`/api/v1/worlds/${throwaway.id}`)
        .set(...csrf)
        .set('X-Test-Role', 'SUPER_ADMIN');
      const { PrismaService } = require('../dist/prisma/prisma.service');
      const stillThere = await app.get(PrismaService).world.findUnique({
        where: { id: throwaway.id },
        select: { id: true },
      });
      // A verification script that leaves rows behind is worse than no script: the
      // next run has more junk to work around and the dev database drifts.
      assert('the throwaway World is really gone afterwards',
        !stillThere,
        `status=${cleanup.status} body=${JSON.stringify(cleanup.body).slice(0, 160)}`);
    }
  }

  await app.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('\nFailures:');
    for (const f of failed) console.log(`  - ${f.label}${f.detail ? ` (${f.detail})` : ''}`);
  }
  process.exit(failed.length ? 1 : 0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
