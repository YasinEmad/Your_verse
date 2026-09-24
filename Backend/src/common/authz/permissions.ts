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
  SUPER_ADMIN: ['*'],
  SHIPPING: ['shipping.read', 'shipping.update'],
};
