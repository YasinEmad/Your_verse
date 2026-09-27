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
    'orders.read',
    'orders.update',
  ],
  SUPER_ADMIN: ['*', 'super_admin.audit.read'],
  // Shipping can see every order (it has to fulfil them) and can cancel one —
  // the parcel is in their hands. It holds neither payment confirmation nor any
  // other money path: money moves when a delivery is recorded, through
  // PaymentsService, and that is not a route anyone can call directly.
  SHIPPING: ['orders.read', 'orders.update', 'shipping.read', 'shipping.update'],
};
