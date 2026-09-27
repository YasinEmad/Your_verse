/**
 * Throttle profiles — backend-architecture.md §17.
 *
 * One in-memory store for v1: a single process, so a per-process counter is
 * accurate. The moment this runs on more than one instance these limits become
 * per-instance and are effectively multiplied by the instance count — the Redis
 * storage swap is documented in §23 for exactly that moment. Do not quote these
 * numbers as a global limit without checking the deployment.
 *
 * One global profile backs every route (`default`, 300/min); a handler tightens
 * or loosens it with `@Throttle({ default: { limit, ttl } })`, and the tiers are
 * named here so a route's limit is never a mystery:
 *
 *   auth    —  5/min. Session exchange mints a Firebase session cookie: the
 *             cheapest thing for an attacker to hammer, and the most valuable to
 *             limit. Cart writes share the tier — they are unauthenticated too
 *             (guest carts) and each one is a database transaction.
 *   orders  — 20/min. Checkout decrements inventory inside a transaction and is
 *             a one-click-order abuse vector.
 *   writes  — 60/min. Every other mutation (catalog, worlds, sections, roles,
 *             shipments).
 *   default — 300/min. Authenticated reads.
 *   public  — 600/min. Unauthenticated catalog/world reads, which every visitor
 *             triggers on every page of the storefront.
 */
export const THROTTLE_LIMITS = {
  auth: { limit: 5, ttl: 60_000 },
  orders: { limit: 20, ttl: 60_000 },
  writes: { limit: 60, ttl: 60_000 },
  default: { limit: 300, ttl: 60_000 },
  public: { limit: 600, ttl: 60_000 },
} as const;

export type ThrottleTier = keyof typeof THROTTLE_LIMITS;
