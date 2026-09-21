const test = require('node:test');
const assert = require('node:assert/strict');

const { PermissionsGuard } = require('../dist/common/guards/permissions.guard.js');

function makeContext(requiredPermissions, req) {
  return {
    getHandler: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
    // reflector is injected into guard, but we simulate via a fake reflector passed to constructor
  };
}

void test('allows when no permissions required', () => {
  const reflector = { get: () => [] };
  const guard = new PermissionsGuard(reflector);
  const ctx = makeContext([], {});

  const ok = guard.canActivate(ctx);
  assert.equal(ok, true);
});

void test('allows SUPER_ADMIN due to wildcard', () => {
  const reflector = { get: () => ['products.delete'] };
  const guard = new PermissionsGuard(reflector);
  const ctx = makeContext(['products.delete'], { user: { role: 'SUPER_ADMIN' } });

  const ok = guard.canActivate(ctx);
  assert.equal(ok, true);
});

void test('allows when role has permission', () => {
  const reflector = { get: () => ['products.update'] };
  const guard = new PermissionsGuard(reflector);
  const ctx = makeContext(['products.update'], { user: { role: 'ADMIN' } });

  const ok = guard.canActivate(ctx);
  assert.equal(ok, true);
});

void test('rejects when user lacks permission', () => {
  const reflector = { get: () => ['products.update'] };
  const guard = new PermissionsGuard(reflector);
  const ctx = makeContext(['products.update'], { user: { role: 'USER' } });

  assert.throws(() => guard.canActivate(ctx));
});

void test('rejects when no user present', () => {
  const reflector = { get: () => ['products.update'] };
  const guard = new PermissionsGuard(reflector);
  const ctx = makeContext(['products.update'], {});

  assert.throws(() => guard.canActivate(ctx));
});
