/**
 * WorldCard — the generic, World-agnostic card used by the Home grid.
 *
 * "Generic" here means: it renders whatever identity fields the API sent, for
 * any World, with no knowledge of which Worlds exist. It does not import from
 * `worlds/registry`, does not know the World's slug in advance, and contains no
 * `slug === …` or name comparison (frontend-architecture.md §2/§7/§32). If a
 * Super Admin creates a World tomorrow, this card renders it with no edit —
 * the only input is the `world` prop.
 *
 * The card is a Server Component (a link and some text — nothing interactive,
 * §10) and stays World-agnostic, which is why it lives in `components/` (§7):
 * `PublicWorld` is a data contract from lib/api, not a World-specific type.
 *
 * The colour strip is where the World's own `themeTokens` show up: those are
 * data (§5 "cosmetic, safe to be fully dynamic"), so they are read defensively
 * and simply omitted when a World has not defined them.
 */
import Link from "next/link";
import { cn } from "cn";
import type { PublicWorld } from "@/lib/api/worlds";

export function WorldCard({ world }: { world: PublicWorld }) {
  const colors = world.themeTokens?.colors ?? {};
  const accent = colors.accent;
  const background = colors.background;

  return (
    <Link
      href={`/${world.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-ring",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {/*
        The strip carries the World's own theme data (§5 "cosmetic, safe to be
        fully dynamic"), read defensively and simply omitted when a World has
        not defined it. This card is rendered inside the app shell rather than
        inside a World's `dir=` wrapper, so the gradient is written explicitly
        rather than inheriting a direction.
      */}
      <span
        aria-hidden="true"
        data-has-theme={accent || background ? "true" : "false"}
        className="h-1.5 w-full"
        style={
          accent || background
            ? {
                backgroundImage: `linear-gradient(to right, ${accent ?? "transparent"}, ${background ?? "transparent"})`,
              }
            : undefined
        }
      />

      <div className="flex flex-1 flex-col gap-1 p-4">
        {/*
          `dir` is read off the World's own data, not inferred from its name:
          an Arabic World's title reads correctly here because the payload says
          RTL, and an LTR World is unaffected (§27). No branch below this point
          knows which World is being rendered.
        */}
        <h2
          dir={world.direction.toLowerCase() === "rtl" ? "rtl" : "ltr"}
          className="text-base font-semibold text-card-foreground group-hover:underline"
        >
          {world.name}
        </h2>
        <p className="text-sm text-muted-foreground">/{world.slug}</p>
        <p className="mt-auto pt-3 text-xs uppercase tracking-widest text-muted-foreground">
          {world.direction.toLowerCase()} · {world.locale ?? "en"}
        </p>
      </div>
    </Link>
  );
}
