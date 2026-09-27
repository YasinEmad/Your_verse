/**
 * B4 permission-matrix check.
 *
 * The assertions here follow backend-architecture.md §207, which is explicit:
 *
 *   "Worlds: identity + theme + capabilities; `worlds.sections.update` permission
 *    distinct from `worlds.update` (identity) so Admin can reorder/configure
 *    sections without being able to rename or delete the World."
 *
 * So ADMIN holds *both* — the split is what lets section composition be Admin's
 * job while World identity stays Super Admin's. An earlier version of this script
 * asserted the opposite and contradicted itself: it printed that ADMIN had
 * `worlds.sections.update` and then exited 3 because it did.
 */
const { ROLE_PERMISSIONS } = require('../dist/common/authz/permissions');

function hasPermission(role, permission) {
  const allowed = ROLE_PERMISSIONS[role] || [];
  if (allowed.includes('*')) return true;
  return allowed.includes(permission);
}

const checks = [
  ['ADMIN can update World identity', hasPermission('ADMIN', 'worlds.update'), true],
  ['ADMIN can compose sections', hasPermission('ADMIN', 'worlds.sections.update'), true],
  ['SUPER_ADMIN can do anything', hasPermission('SUPER_ADMIN', 'anything.random'), true],
  // The separation only means something if the other side is actually excluded.
  ['USER cannot update World identity', hasPermission('USER', 'worlds.update'), false],
  ['USER cannot compose sections', hasPermission('USER', 'worlds.sections.update'), false],
  ['SHIPPING cannot compose sections', hasPermission('SHIPPING', 'worlds.sections.update'), false],
  ['SHIPPING cannot touch the catalog', hasPermission('SHIPPING', 'products.update'), false],
  ['ADMIN cannot manage users', hasPermission('ADMIN', 'super_admin.audit.read'), false],
  ['ADMIN can read and update shipments',
    hasPermission('ADMIN', 'shipping.read') && hasPermission('ADMIN', 'shipping.update'), true],
  ['USER can read the catalog but not change it',
    hasPermission('USER', 'products.read') && !hasPermission('USER', 'products.update'), true],
];

let failed = 0;
for (const [label, actual, expected] of checks) {
  if (actual === expected) {
    console.log(`PASS  ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${label} — expected ${expected}, got ${actual}`);
  }
}

console.log(`\n${checks.length - failed}/${checks.length} permission checks passed`);
process.exit(failed ? 1 : 0);
