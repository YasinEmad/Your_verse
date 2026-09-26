// Role -> allowed permission strings. Keep simple for Phase B3.
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  USER: [
    'products.read',
    'worlds.read',
    'orders.create',
    'orders.read',
  ],
  ADMIN: [
    'products.create',
    'products.update',
    'products.delete',
    'worlds.update',
    'worlds.sections.update',
    'shipping.read',
    'shipping.update',
  ],
  SUPER_ADMIN: ['*', 'super_admin.audit.read'],
  SHIPPING: ['orders.read', 'shipping.read', 'shipping.update'],
};
