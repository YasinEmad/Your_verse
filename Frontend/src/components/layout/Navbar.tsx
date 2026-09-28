/**
 * Navbar — global shared chrome, frontend-architecture.md §4 (store shell) and
 * §10 (Server Component by default).
 *
 * Rendered from the **root** layout, above `{children}`, so it is present on
 * every route: Home, `/[worldSlug]`, and the Admin / Super Admin / Shipping
 * groups. It is a Server Component: the World list arrives as a prop-ready
 * server fetch, so the markup a visitor gets is already populated and none of
 * the API base URL or fetch logic reaches the client bundle (§10). The single
 * interactive island is `<NavbarAuthSlot />`, a "use client" child — the layout
 * above it never becomes one.
 *
 * Three properties this component must not break:
 *
 * 1. **No World is named, counted or special-cased here.** `listActiveWorlds()`
 *    is the live DB read; a World added through Super Admin appears here with no
 *    frontend change. Nothing branches on `worldSlug` or name — the switcher
 *    maps whatever it is given (frontend-architecture.md §2/§32).
 * 2. **No World-name branching, no World-specific layout.** This chrome renders
 *    identically for every World; per-World visuals belong to the WORLD_REGISTRY
 *    layouts that the store route already applies (§5).
 * 3. **It must never 500 the app.** The fetch goes through `listActiveWorlds()`,
 *    which resolves to `[]` on failure, so an unreachable API degrades the
 *    switcher to nothing instead of taking down every route beneath it.
 *
 * Spacing uses Tailwind logical properties (`ms-`, `pe-`, `text-start`) so the
 * bar flips correctly under `dir="rtl"` without knowing RTL exists (§27).
 */
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { listActiveWorlds } from "@/lib/api/worlds";
import { NavbarAuthSlot } from "./NavbarAuthSlot";

export async function Navbar() {
  const worlds = await listActiveWorlds();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:px-8">
        <Link
          href="/"
          className="shrink-0 text-base font-semibold tracking-tight text-foreground"
        >
          Yourverse
        </Link>

        <nav
          aria-label="Worlds"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
        >
          {worlds.map((world) => (
            <Link
              key={world.id}
              href={`/${world.slug}`}
              className="inline-flex h-8 shrink-0 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {world.name}
            </Link>
          ))}
        </nav>

        {/*
          Cart affordance only. F6 owns cart: there is no cart query key to read
          yet (`features/cart` is an empty barrel), and this chrome cannot build
          a cart URL without knowing which World it is sitting above — which would
          be exactly the `worldSlug` branching §32 forbids. So the icon is
          rendered inert rather than given a fabricated count or a link to an
          arbitrary World's cart. F6 replaces this block with a link plus a live
          count from the cart query key; nothing else in this file changes.
        */}
        <span
          aria-hidden="true"
          title="Cart is not available yet"
          data-cart-state="unavailable"
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground opacity-50"
        >
          <ShoppingCart className="size-4" />
        </span>

        <NavbarAuthSlot />
      </div>
    </header>
  );
}
