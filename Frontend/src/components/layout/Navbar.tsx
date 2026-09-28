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
 * ## Shape
 *
 * A floating pill docked to the bottom of the viewport rather than a full-width
 * bar across the top, so the brand and the World switcher hover over the content
 * instead of permanently displacing it. The pill is opaque and carries its own
 * hairline; the wrapper around it is `pointer-events-none` so only the pill
 * itself — not the full-width strip it sits in — takes clicks.
 *
 * ## Three properties this component must not break:
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
 * Spacing uses Tailwind logical properties (`ms-`, `me-`) so the pill mirrors
 * correctly under `dir="rtl"` without knowing RTL exists (§27).
 */
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { listActiveWorlds } from "@/lib/api/worlds";
import { NavbarAuthSlot } from "./NavbarAuthSlot";

/**
 * The wordmark glyph: a planet with a ring passing behind it. Drawn as two
 * shapes rather than a clipped three, so the SVG needs no `<defs>` id — those
 * would collide the moment this ever rendered twice on a page, and at 22px the
 * ring reading as *behind* the body is indistinguishable from passing in front.
 */
function PlanetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <ellipse
        cx="12"
        cy="12"
        rx="10.5"
        ry="3.6"
        transform="rotate(-25 12 12)"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="6" fill="currentColor" />
    </svg>
  );
}

export async function Navbar() {
  const worlds = await listActiveWorlds();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-8 z-50 flex justify-center px-4">
      <nav
        aria-label="Primary"
        className={[
          "pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-card p-2",
          // A drop shadow is nearly invisible against a black canvas, so the
          // pill is separated by its hairline plus a soft bloom in the accent
          // instead — the dark-mode equivalent of an elevated surface.
          "shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.35)]",
        ].join(" ")}
      >
        <Link
          href="/"
          aria-label="Yourverse — home"
          className="group/logo grid size-11 shrink-0 place-items-center rounded-full bg-foreground text-background transition-transform duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:group-hover/logo:-rotate-12 motion-safe:group-hover/logo:scale-105"
        >
          <PlanetIcon />
        </Link>

        {/*
          The World switcher. On a narrow viewport the pill has no room for a row
          of them, so they scroll sideways inside the pill rather than being
          hidden — these links are the only way into a World, and dropping them
          on phones would leave the storefront with no navigation at all.
        */}
        <ul className="me-2.5 ms-3 flex min-w-0 items-center gap-0.5 overflow-x-auto p-0">
          {worlds.map((world) => (
            <li key={world.id} className="shrink-0">
              <Link
                href={`/${world.slug}`}
                className="block rounded-full px-3.5 py-2.5 text-[0.9375rem] font-medium whitespace-nowrap text-foreground transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {world.name}
              </Link>
            </li>
          ))}
        </ul>

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
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground opacity-50"
        >
          <ShoppingCart className="size-4" />
        </span>

        <NavbarAuthSlot />
      </nav>
    </div>
  );
}
