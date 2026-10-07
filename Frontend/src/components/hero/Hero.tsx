/**
 * Hero — Home route. "The rift".
 *
 * One memorable thing: the rocket flies through a tear in space. The two
 * hero images are the universes on either side of the tear, cut with
 * jagged edges that face each other. Everything else stays quiet.
 *
 *  - Load: the rift draws itself top to bottom, then the two worlds slide
 *    apart to open it. This is the only entrance motion on the page.
 *  - Hover (stage): the worlds drift a few pixels further apart.
 *  - Hover / focus a world name: the rift changes colour to that world's
 *    hue and the tagline appears under the row. The row is the control.
 *
 * Server Component, zero client JS (HeroClient is the only client piece).
 *
 * Rules kept from the Navbar (frontend-architecture.md §2/§32):
 *  - Nothing here names, counts or branches on a World. Order comes from the
 *    list; links use `slug`, text uses `name` / `tagline`. The hue of each
 *    world is derived from its position in the list, not from its identity.
 *  - Logical properties for placement. Direction-dependent shapes (jagged
 *    edges, slide direction) flip under `dir="rtl"` through `--dir`.
 *  - Colour comes from CSS custom properties only.
 *  - All motion is switched off by `prefers-reduced-motion`.
 *
 * ## Wiring
 * `DEMO_WORLDS` is placeholder data. Build `HeroWorld[]` from
 * `listActiveWorlds()` / `WorldConfig` and pass it as `worlds`.
 * Keyframes and hover rules live in the <style> block at the bottom so the
 * file is standalone.
 *
 * ## HeroClient
 * The rocket is faded into the sky with a radial mask, so it works with a
 * transparent or dark canvas background. If its canvas paints an opaque
 * background, add `mix-blend-screen` to the wrapper marked (A) below.
 */
import Image from "next/image";
import hero2 from "@/components/hero2.jpg";
import hero from "@/components/hero.jpg";

export type HeroWorld = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
};

// ── Placeholder data — replace with WorldConfig-driven data ─────────────────
const DEMO_WORLDS: HeroWorld[] = [
  { id: "1", slug: "tech", name: "Tech", tagline: "Gear that earns its desk space." },
  { id: "2", slug: "anime", name: "Anime", tagline: "Figures, prints and shelf pieces." },
  { id: "3", slug: "poetry", name: "Poetry", tagline: "Books and objects for slow reading." },
  { id: "4", slug: "football", name: "Football", tagline: "Match-day kit and collectibles." },
  { id: "5", slug: "gaming", name: "Gaming", tagline: "Peripherals, collectibles, the good chair." },
  { id: "6", slug: "chess", name: "Chess", tagline: "Boards, sets and clocks for serious play." },
];

/** Spread hues evenly around the wheel, starting at a cool blue. */
const BASE_HUE = 235;
const hueAt = (i: number, n: number) => Math.round((BASE_HUE + (i * 360) / n) % 360);

/** Deterministic stars (seeded, so server and client render the same sky). */
function makeStars(count: number) {
  let s = 7;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: rnd() * 100,
    y: rnd() * 100,
    size: i % 9 === 0 ? 2 : 1,
    alpha: 0.25 + rnd() * 0.45,
    twinkle: i % 5 === 0,
    delay: -rnd() * 8,
  }));
}

const STARS = makeStars(56);

export function Hero({ worlds = DEMO_WORLDS }: { worlds?: HeroWorld[] }) {
  // One hover rule per row position, generated from the list length.
  const hueRules = worlds
    .map(
      (_, i) =>
        `.hero-root:has(.w-${i}:hover),.hero-root:has(.w-${i}:focus-visible){--hue:${hueAt(i, worlds.length)}}`,
    )
    .join("\n");

  return (
    <section className="hero-root relative isolate mx-auto flex min-h-svh w-full max-w-6xl flex-col items-center px-4 pb-20 pt-28 text-center">
      {/* Sky: fine stars, faded out toward the edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-40vw] inset-y-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_72%)]"
      >
        {STARS.map((st) => (
          <span
            key={st.id}
            className={`absolute rounded-full bg-foreground ${st.twinkle ? "hero-twinkle" : ""}`}
            style={{
              insetInlineStart: `${st.x}%`,
              top: `${st.y}%`,
              width: st.size,
              height: st.size,
              opacity: st.alpha,
              animationDelay: `${st.delay}s`,
            }}
          />
        ))}
        <span className="hero-shoot absolute start-[70%] top-[14%] h-px w-24 bg-gradient-to-r from-transparent to-foreground/60" />
      </div>

      <header className="max-w-3xl">
        <h1 className="hero-isometra text-balance text-5xl font-light leading-[1] text-foreground sm:text-6xl md:text-7xl">
          Every obsession gets its own world.
        </h1>
      </header>

      {/* The rift: two worlds, one tear, one rocket */}
      <div className="hero-stage group relative my-10 w-full max-w-5xl flex-1 aspect-[4/5] sm:aspect-[16/11] lg:aspect-[16/9]">
        {/* Glow that lives behind the tear and follows the active hue */}
        <div
          aria-hidden
          className="hero-halo pointer-events-none absolute inset-y-[6%] start-1/2 w-[34%] -translate-x-1/2 rtl:translate-x-1/2"
        />

        {/* World A — tech image, jagged edge faces inline-end */}
        <div className="hero-slide-a absolute inset-y-0 start-0 w-[48%]">
          <div className="hero-drift-a absolute inset-x-0 top-[4%] h-[84%]">
            <div className="hero-shard hero-shard-a absolute inset-0 overflow-hidden bg-neutral-900">
              <Image
                src={hero}
                alt="Hero image"
                fill
                priority
                sizes="(min-width: 1024px) 480px, 48vw"
                className="object-cover object-center"
              />
              <div aria-hidden className="hero-edge hero-edge-a absolute inset-0" />
            </div>
          </div>
        </div>

        {/* World B — chess image, jagged edge faces inline-start, sits lower */}
        <div className="hero-slide-b absolute inset-y-0 end-0 w-[48%]">
          <div className="hero-drift-b absolute inset-x-0 top-[14%] h-[80%]">
            <div className="hero-shard hero-shard-b absolute inset-0 overflow-hidden bg-neutral-900">
              <Image
                src={hero2}
                alt="Hero second image"
                fill
                priority
                sizes="(min-width: 1024px) 480px, 48vw"
                className="object-cover object-center"
              />
              <div aria-hidden className="hero-edge hero-edge-b absolute inset-0" />
            </div>
          </div>
        </div>

        {/* The tear itself: a single line that draws itself on load */}
        <svg
          aria-hidden
          viewBox="0 0 20 100"
          preserveAspectRatio="none"
          className="hero-rift pointer-events-none absolute inset-y-[3%] start-1/2 z-10 h-[94%] w-[5%] -translate-x-1/2 overflow-visible rtl:translate-x-1/2"
        >
          <polyline
            pathLength={1}
            vectorEffect="non-scaling-stroke"
            points="10,0 13,9 7,18 14,28 6,38 13,48 7,58 14,68 6,79 12,89 10,100"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="miter"
          />
        </svg>

        {/* The imagery remains as the main focal point without the separate Rocket animation */}
      </div>

      <style>{`
        @property --hue { syntax: '<number>'; inherits: true; initial-value: ${BASE_HUE}; }

        .hero-root {
          --dir: 1;
          --hue: ${BASE_HUE};
          --rift: oklch(0.76 0.11 var(--hue));
          transition: --hue 700ms ease;
        }
        [dir='rtl'] .hero-root { --dir: -1; }
        ${hueRules}

        /* Rift colour drives the line, the halo and the edge light */
        .hero-rift { color: var(--rift); filter: drop-shadow(0 0 6px var(--rift)); }
        .hero-halo {
          background: radial-gradient(closest-side, color-mix(in oklab, var(--rift) 30%, transparent), transparent);
          filter: blur(28px);
        }

        /* Jagged edges. Each shard's torn side faces the rift. */
        .hero-shard-a {
          clip-path: polygon(0 0, 100% 0, 92% 11%, 100% 23%, 90% 37%, 98% 51%, 89% 65%, 99% 79%, 91% 91%, 96% 100%, 0 100%);
          border-start-start-radius: 1.75rem;
          border-end-start-radius: 1.75rem;
        }
        .hero-shard-b {
          clip-path: polygon(8% 0, 100% 0, 100% 100%, 4% 100%, 9% 91%, 1% 79%, 11% 65%, 2% 51%, 10% 37%, 0 23%, 8% 11%);
          border-start-end-radius: 1.75rem;
          border-end-end-radius: 1.75rem;
        }
        [dir='rtl'] .hero-shard-a {
          clip-path: polygon(0 0, 92% 0, 100% 100%, 4% 100%, 9% 91%, 1% 79%, 11% 65%, 2% 51%, 10% 37%, 0 23%, 8% 11%);
        }
        [dir='rtl'] .hero-shard-b {
          clip-path: polygon(0 0, 100% 0, 92% 11%, 100% 23%, 90% 37%, 98% 51%, 89% 65%, 99% 79%, 91% 91%, 96% 100%, 0 100%);
        }

        /* Light spilling from the tear onto each image, plus a soft fade on the far side */
        .hero-edge-a {
          background:
            linear-gradient(to right, color-mix(in oklab, var(--rift) 32%, transparent), transparent 42%),
            linear-gradient(to left, transparent 70%, rgb(0 0 0 / .35));
        }
        .hero-edge-b {
          background:
            linear-gradient(to left, color-mix(in oklab, var(--rift) 32%, transparent), transparent 42%),
            linear-gradient(to right, transparent 70%, rgb(0 0 0 / .35));
        }
        [dir='rtl'] .hero-edge-a { transform: scaleX(-1); }
        [dir='rtl'] .hero-edge-b { transform: scaleX(-1); }

        /* Hover on the stage: worlds drift a touch further apart */
        .hero-drift-a, .hero-drift-b { transition: translate 700ms cubic-bezier(.2,.7,.2,1); }
        .hero-stage:hover .hero-drift-a { translate: calc(var(--dir) * -10px) 0; }
        .hero-stage:hover .hero-drift-b { translate: calc(var(--dir) * 10px) 0; }

        /* World-name dot takes the rift colour of its own row position */
        .hero-dot {
          width: .5rem; height: .5rem; border-radius: 9999px;
          background: oklch(0.76 0.11 var(--h));
          align-self: center;
        }

        /* Page load: the rift draws, then the worlds slide apart */
        @keyframes hero-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes hero-open-a { from { translate: calc(var(--dir) * 18%) 0; opacity: 0; } to { translate: 0 0; opacity: 1; } }
        @keyframes hero-open-b { from { translate: calc(var(--dir) * -18%) 0; opacity: 0; } to { translate: 0 0; opacity: 1; } }
        @keyframes hero-fade { from { opacity: 0; } to { opacity: 1; } }
        .hero-rift polyline { stroke-dasharray: 1; animation: hero-draw 900ms ease-out both; }
        .hero-slide-a { animation: hero-open-a 1100ms cubic-bezier(.2,.7,.2,1) 700ms both; }
        .hero-slide-b { animation: hero-open-b 1100ms cubic-bezier(.2,.7,.2,1) 700ms both; }
        .hero-halo, .hero-rocket { animation: hero-fade 900ms ease-out 900ms both; }

        /* Sky */
        @keyframes hero-twinkle { 0%,100% { opacity: .2; } 50% { opacity: .8; } }
        @keyframes hero-shoot {
          0%, 90% { transform: translate(0,0) rotate(20deg); opacity: 0; }
          92%     { opacity: 1; }
          100%    { transform: translate(-22rem, 8rem) rotate(20deg); opacity: 0; }
        }
        .hero-twinkle { animation: hero-twinkle 6s ease-in-out infinite; }
        .hero-shoot   { animation: hero-shoot 16s ease-in 3s infinite; opacity: 0; }
        [dir='rtl'] .hero-shoot { scale: -1 1; }

        @media (prefers-reduced-motion: reduce) {
          .hero-twinkle, .hero-shoot, .hero-rift polyline,
          .hero-slide-a, .hero-slide-b, .hero-halo, .hero-rocket { animation: none !important; }
          .hero-shoot { display: none; }
          .hero-root, .hero-drift-a, .hero-drift-b { transition: none; }
        }
      `}</style>
    </section>
  );
}