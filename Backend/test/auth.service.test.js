const test = require('node:test');
const assert = require('node:assert/strict');

const { AuthService } = require('../dist/modules/auth/auth.service.js');

void test('createSession upserts user and returns session cookie', async () => {
  const prisma = {
    user: {
      upsert: async (args) => ({
        id: 'user-1',
        firebaseUid: args.where.firebaseUid,
        email: args.create.email,
        displayName: args.create.displayName,
        role: args.create.role,
      }),
    },
  };

  const auth = {
    verifyIdToken: async () => ({
      uid: 'firebase-123',
      email: 'alice@example.com',
      name: 'Alice',
    }),
    createSessionCookie: async () => 'session-cookie-value',
    revokeRefreshTokens: async () => undefined,
  };

  const service = new AuthService(prisma, { getAuth: () => auth });
  const cookie = await service.createSession('id-token');

  assert.equal(cookie, 'session-cookie-value');
});

void test('verifySessionCookie throws unauthorized for invalid cookie', async () => {
  const prisma = { user: { findUnique: async () => null } };
  const auth = {
    verifySessionCookie: async () => {
      throw new Error('bad cookie');
    },
  };

  const service = new AuthService(prisma, { getAuth: () => auth });

  await assert.rejects(() => service.verifySessionCookie('bad-cookie'), /Invalid or revoked session cookie/);
});
