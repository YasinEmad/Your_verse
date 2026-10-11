/**
 * NavbarCart — the cart affordance in the global pill (Phase 6).
 *
 * A Client Component because the path it must react to (`/" + worldSlug`) is
 * only knowable once a route is served, and the item count is server-query
 * state. Sitting above *every* route — home, store, admin, auth — it renders
 * a link only when it is actually above one of the World storefronts; on
 * Home / admin / auth routes (whose first path segment is a known reserved
 * route rather than a World slug) it falls back to the inert icon the F6
 * placeholder shipped, so it never fabricates a link to an arbitrary world.
 *
 * The World list is not duplicated here: whatever the first segment is, if it
 * is not a reserved top-level route it is a World's slug (every storefront
 * route lives under `/[worldSlug]`), so new Worlds need no change to this
 * component.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/features/cart";

const RESERVED_TOP_LEVEL_ROUTES = new Set(["admin", "shipping", "super-admin", "login"]);

export function NavbarCart() {
  const pathname = usePathname();
  const segment = pathname.split("/")[1] ?? "";
  const worldSlug = segment && !RESERVED_TOP_LEVEL_ROUTES.has(segment) ? segment : null;
  const { data } = useCart(Boolean(worldSlug));
  const count = data?.itemCount ?? 0;

  if (!worldSlug) {
    return (
      <span
        aria-hidden="true"
        title="Cart is not available on this page"
        data-cart-state="unavailable"
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground opacity-50"
      >
        <ShoppingCart className="size-4" />
      </span>
    );
  }

  return (
    <Link
      href={`/${worldSlug}/cart`}
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      data-cart-state="available"
      className="relative grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ShoppingCart className="size-4" />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -end-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.625rem] font-semibold leading-4 text-primary-foreground"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}