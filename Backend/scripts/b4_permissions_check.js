const { ROLE_PERMISSIONS } = require('../dist/common/authz/permissions');

function hasPermission(role, permission) {
  const allowed = ROLE_PERMISSIONS[role] || [];
  if (allowed.includes('*')) return true;
  return allowed.includes(permission);
}

console.log('ADMIN has worlds.update?', hasPermission('ADMIN', 'worlds.update'));
console.log('ADMIN has worlds.sections.update?', hasPermission('ADMIN', 'worlds.sections.update'));
console.log('SUPER_ADMIN has worlds.sections.update?', hasPermission('SUPER_ADMIN', 'worlds.sections.update'));

if (!hasPermission('ADMIN', 'worlds.update')) {
  console.error('FAIL: ADMIN should have worlds.update');
  process.exit(2);
}

if (hasPermission('ADMIN', 'worlds.sections.update')) {
  console.error('FAIL: ADMIN should NOT have worlds.sections.update');
  process.exit(3);
}

if (!hasPermission('SUPER_ADMIN', 'anything.random')) {
  console.error('FAIL: SUPER_ADMIN wildcard should allow everything');
  process.exit(4);
}

console.log('Permissions check passed');
process.exit(0);
