/**
 * WorldCard — the generic, World-agnostic card used by the Home rail.
 *
 * "Generic" here means: it renders whatever identity fields the API sent, for
 * any World, with no knowledge of which Worlds exist. It does not import from
 * `worlds/registry`, does not know the World's slug in advance, and contains no
 * `slug === …` or name comparison (frontend-architecture.md §2/§7/§32). If a
 * Super Admin creates a World tomorrow, this card renders it with no edit —
 * the only inputs are the `world` prop and an optional `image`.
 *
 * The card is a Server Component (a link and some text — nothing interactive,
 * §10) and stays World-agnostic, which is why it lives in `components/` (§7):
 * `PublicWorld` is a data contract from lib/api, not a World-specific type.
 *
 * Design: a tall doorway.
 *  - With an `image`: the photo fills the card and its inline-end edge is torn.
 *    Behind the tear shows a shard of the World's accent colour. On hover or
 *    focus the tear moves outward, so the image opens up. The title sits on a
 *    dark scrim in white, so legibility never depends on the photo.
 *  - Without an `image`: the accent shard and background wash carry the card
 *    on their own, with text in the app's own foreground tokens.
 *  The World's `themeTokens` colours (data, §5 "cosmetic, safe to be fully
 *  dynamic") are decoration only and fall back to neutral values when a World
 *  has not defined them.
 *
 * Direction: the tear and shard mirror with the document direction (`rtl:`),
 * and the title takes `dir` from the World's own data, not its name (§27).
 * The image is decorative (`alt=""`) because the title already names the World.
 */
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { cn } from "cn";
import type { PublicWorld } from "@/lib/api/worlds";

// ── Torn edge ───────────────────────────────────────────────────────────────
// y positions and sideways jitter of the tear, top to bottom.
const YS = [0, 12, 25, 38, 52, 65, 78, 91, 100];
const OFFS = [0, -7, 3, -9, 2, -11, 1, -8, 0];

/** Polygon covering everything inline-start of a torn edge at `base`% across. */
function tornEdge(base: number, mirror: boolean) {
  const x = (v: number) => (mirror ? 100 - v : v);
  const edge = YS.map((y, i) => `${x(base + OFFS[i])}% ${y}%`).join(", ");
  const start = mirror ? "100% 0" : "0 0";
  const end = mirror ? "100% 100%" : "0 100%";
  return `polygon(${start}, ${edge}, ${end})`;
}

const REST = 80; // tear position at rest (% of card width)
const OPEN = 94; // tear position on hover / focus

type WorldCardProps = {
  world: PublicWorld;
  /** Optional picture for the card: a static import or a URL allowed by next.config. */
  image?: StaticImageData | string;
};

export function WorldCard({ world, image }: WorldCardProps) {
  const colors = world.themeTokens?.colors ?? {};
  const accent = colors.accent;
  const background = colors.background;
  const isRtl = world.direction.toLowerCase() === "rtl";
  const onImage = Boolean(image);
  const textFont = isRtl ? "Ruwudu, 'Segoe UI', sans-serif" : "Isometra, sans-serif";

  const style = {
    "--w-accent": accent ?? "currentColor",
    "--w-bg": background ?? "transparent",
    "--clip-rest": tornEdge(REST, false),
    "--clip-open": tornEdge(OPEN, false),
    "--clip-rest-rtl": tornEdge(REST, true),
    "--clip-open-rtl": tornEdge(OPEN, true),
  } as CSSProperties;

  return (
    <Link
      href={`/${world.slug}`}
      data-has-theme={accent || background ? "true" : "false"}
      style={style}
      className={cn(
        "group relative isolate flex h-[24rem] w-[min(72vw,17rem)] flex-col justify-end overflow-hidden rounded-2xl border border-border bg-card p-5 transition-colors duration-300 motion-reduce:transition-none",
        "hover:border-[var(--w-accent)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      {/* The World's background colour, as a wash rising from the bottom */}
      <span
        aria-hidden="true"
        className="absolute inset-0 z-0 opacity-60 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:transition-none"
        style={{
          backgroundImage:
            "linear-gradient(to top, color-mix(in oklab, var(--w-bg) 85%, transparent), transparent 70%)",
        }}
      />

      {/* The accent shard: the colour you see through the tear */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className={cn(
          "absolute inset-y-0 end-0 z-0 h-full transition-[width] duration-500 ease-out motion-reduce:transition-none rtl:-scale-x-100",
          onImage
            ? "w-1/3"
            : "w-2/5 [mask-image:linear-gradient(to_bottom,black,transparent_85%)] group-hover:w-3/5",
        )}
      >
        <polygon
          points="100,0 30,0 22,12 34,24 20,38 32,52 18,66 31,80 21,92 28,100 100,100"
          style={{ fill: "color-mix(in oklab, var(--w-accent) 70%, transparent)" }}
        />
      </svg>

      {image && (
        <>
          {/* The picture, cut by the torn edge */}
          <span
            aria-hidden="true"
            className="absolute inset-0 z-[1] transition-[clip-path] duration-700 ease-out motion-reduce:transition-none [clip-path:var(--clip-rest)] group-hover:[clip-path:var(--clip-open)] group-focus-visible:[clip-path:var(--clip-open)] rtl:[clip-path:var(--clip-rest-rtl)] rtl:group-hover:[clip-path:var(--clip-open-rtl)] rtl:group-focus-visible:[clip-path:var(--clip-open-rtl)]"
          >
            <Image
              src={image}
              alt=""
              fill
              sizes="272px"
              className="object-cover object-center"
            />
          </span>
          {/* Scrim: guarantees the white title reads on any photo */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 z-[2] h-3/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
          />
        </>
      )}

      <h3
        dir={isRtl ? "rtl" : "ltr"}
        className={cn(
          "relative z-10 text-balance text-3xl font-light leading-tight tracking-[-0.06em]",
          onImage ? "text-white" : "text-card-foreground",
        )}
        style={{ fontFamily: textFont }}
      >
        {world.name}
      </h3>
      <p
        className={cn(
          "relative z-10 mt-1 text-sm",
          onImage ? "text-white/70" : "text-muted-foreground",
        )}
        style={{ fontFamily: textFont }}
      >
        /{world.slug}
      </p>

      {/* Affordance: the rule grows to full width on hover and focus */}
      <span
        aria-hidden="true"
        className="relative z-10 mt-5 block h-px w-8 bg-[var(--w-accent)] transition-[width] duration-500 ease-out group-hover:w-full group-focus-visible:w-full motion-reduce:transition-none"
      />
    </Link>
  );
}