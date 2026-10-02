/**
 * Navbar — global shared chrome, frontend-architecture.md §4 (store shell) and
 * §10 (Server Component by default).
 *
 * Rendered from the **root** layout, above `{children}`, so it is present on
 * every route: Home, `/[worldSlug]`, and the Admin / Super Admin / Shipping
 * groups. It is a Server Component: the World list is fetched on the server, so
 * the markup a visitor gets is already populated and none of the API base URL or
 * fetch logic reaches the client bundle (§10). The single interactive island is
 * `<NavbarAuthSlot />`, a "use client" child — the layout above it never
 * becomes one.
 *
 * ## Shape
 *
 * A floating pill pinned to the top of the viewport, inset from the edges so the
 * brand and the World switcher hover over the content instead of permanently
 * displacing it. The pill is opaque and carries its own hairline; the wrapper
 * around it is `pointer-events-none` so only the pill itself — not the
 * full-width strip it sits in — takes clicks.
 *
 * The pill has three zones, separated by hairline dividers:
 *   brand  |  World switcher (flexes, scrolls sideways)  |  actions (cart, auth)
 *
 * Because the bar is `fixed`, page content must reserve room for it (e.g.
 * `pt-24` on the root layout's main wrapper).
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
 *    switcher to nothing instead of taking down every route beneath it. The
 *    switcher zone still renders (empty) so the actions stay docked to the end.
 *
 * Spacing uses Tailwind logical properties (`ms-`, `me-`, `ps-`, `pe-`) so the
 * pill mirrors correctly under `dir="rtl"` without knowing RTL exists (§27).
 */
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import logo2 from "@/components/logo2.png";
import { listActiveWorlds } from "@/lib/api/worlds";
import { NavbarAuthSlot } from "./NavbarAuthSlot";

/** Hairline between zones. It encodes grouping, so it is hidden from AT. */
function Divider() {
  return <span aria-hidden="true" className="h-6 w-px shrink-0 bg-border" />;
}

export async function Navbar() {
  const worlds = await listActiveWorlds();

  const getWorldFont = (direction?: string) =>
    direction?.toLowerCase() === "rtl" ? "Ruwudu, 'Segoe UI', sans-serif" : "Isometra, sans-serif";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4">
      <nav
        aria-label="Primary"
        className={[
          "pointer-events-auto flex w-full max-w-6xl items-center gap-2 rounded-full border border-border bg-card p-1.5 sm:gap-3",
          // A drop shadow is nearly invisible against a black canvas, so the
          // pill is separated by its hairline plus a soft bloom in the accent
          // instead — the dark-mode equivalent of an elevated surface.
          "shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.35)]",
        ].join(" ")}
      >
        {/*
          Brand. The hover motion lives on the inner glyph chip, not the link:
          `group-hover/*` only applies to descendants of the group, so putting it
          on the same element that carries `group/logo` (as before) never fired.
          The wordmark is hidden on phones, where the glyph alone holds the slot.
        */}
        <Link
          href="/"
          aria-label="Yourverse — home"
          className="group/logo flex shrink-0 items-center gap-2.5 rounded-full pe-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:pe-3"
        >
          <span className="grid size-10 place-items-center overflow-hidden rounded-full text-background transition-transform duration-200 motion-safe:group-hover/logo:-rotate-12 motion-safe:group-hover/logo:scale-105">
            <Image src={logo2} alt="" width={40} height={40} className="h-full w-full object-cover" />
          </span>
          <span
            className="hidden text-[0.9375rem] font-semibold tracking-[-0.06em] text-foreground sm:inline"
            style={{ fontFamily: "Isometra, sans-serif" }}
          >
            Yourverse
          </span>
        </Link>

        <Divider />

        {/*
          The World switcher. On a narrow viewport the pill has no room for a row
          of them, so they scroll sideways inside the pill rather than being
          hidden — these links are the only way into a World, and dropping them
          on phones would leave the storefront with no navigation at all.

          `flex-1` keeps the zone in place when the list is empty, so the actions
          stay docked to the end. The scrollbar is hidden and the edges fade out
          so it reads as "more this way" rather than as a clipped row.
        */}
        <div className="min-w-0 flex-1">
          <ul
            className={[
              "flex items-center gap-0.5 overflow-x-auto p-0",
              "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              "[mask-image:linear-gradient(to_right,transparent,#000_12px,#000_calc(100%-12px),transparent)]",
            ].join(" ")}
          >
            {worlds.map((world) => (
              <li key={world.id} className="shrink-0">
                <Link
                  href={`/${world.slug}`}
                  className="block rounded-full px-3.5 py-2 text-[0.9375rem] font-medium whitespace-nowrap text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ fontFamily: getWorldFont(world.direction) }}
                  dir={world.direction?.toLowerCase() === "rtl" ? "rtl" : "ltr"}
                >
                  {world.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Divider />

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