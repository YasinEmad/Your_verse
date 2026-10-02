import Link from "next/link";
import type { PublicWorld } from "@/lib/api/worlds";
import { WorldCard } from "@/components/worlds/WorldCard";
import { imageForWorld } from "@/components/worlds/WorldImages";

type WorldSectionProps = {
  worlds: PublicWorld[];
};

export function WorldSection({ worlds }: WorldSectionProps) {
  const count = String(worlds.length).padStart(2, "0");

  return (
    <section
      aria-labelledby="worlds-heading"
      className="relative mt-10 overflow-hidden"
    >
      {/* ambient portal glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <header className="relative mb-8 flex items-end justify-between gap-6">
        <div>
          <p className="mb-3 flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.3em] text-muted-foreground">
            <span className="h-px w-8 bg-border" />
            Multiverse index
          </p>
          <h2
            id="worlds-heading"
            className="text-3xl font-light tracking-[-0.06em] sm:text-5xl"
            style={{ fontFamily: "Isometra, sans-serif" }}
          >
            Choose a world
          </h2>
          <p className="mt-3 max-w-sm text-muted-foreground">
            Each world is its own storefront. Swipe or scroll sideways to
            explore them all.
          </p>
        </div>

        {worlds.length > 0 && (
          <div
            aria-label={`${worlds.length} worlds open`}
            className="hidden shrink-0 text-right font-mono sm:block"
          >
            <span className="block text-4xl font-light tabular-nums leading-none">
              {count}
            </span>
            <span className="mt-1 block text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
              Worlds open
            </span>
          </div>
        )}
      </header>

      {worlds.length > 0 ? (
        <>
          <ul
            role="list"
            className="relative -mx-4 flex snap-x snap-mandatory items-start gap-5 overflow-x-auto scroll-px-4 px-4 pb-6 pt-1 [mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-2rem),transparent)] [scrollbar-width:none] md:-mx-8 md:scroll-px-8 md:px-8 [&::-webkit-scrollbar]:hidden"
          >
            {worlds.map((world) => (
              <li
                key={world.id}
                className="shrink-0 snap-start transition-transform duration-500 ease-out motion-safe:hover:-translate-y-1 sm:even:mt-10"
              >
                <WorldCard world={world} image={imageForWorld(world.slug)} />
              </li>
            ))}
          </ul>

          {/* swipe hint */}
          <div
            aria-hidden
            className="mb-2 flex items-center gap-3 font-mono text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground md:hidden"
          >
            <span>Swipe</span>
            <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
            <span>→</span>
          </div>
        </>
      ) : (
        <div className="relative rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <div
            aria-hidden
            className="mx-auto mb-6 size-16 rounded-full border border-dashed border-border motion-safe:animate-[spin_24s_linear_infinite]"
          />
          <p className="text-lg font-light">No worlds are open yet.</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
            New worlds show up here as soon as a Super Admin publishes one.
          </p>
        </div>
      )}

      <p className="mt-12 flex items-center gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
        <span>Staff?</span>
        <Link
          href="/login"
          className="rounded-sm underline underline-offset-4 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Sign in
        </Link>
        <span>to reach the dashboards.</span>
      </p>
    </section>
  );
}