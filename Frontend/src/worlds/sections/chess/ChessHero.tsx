import Image from "next/image";

export type ChessHeroStat = {
  label: string;
  value: string;
};

export type ChessHeroConfig = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  stats?: ChessHeroStat[];
  ctaLabel?: string;
  ctaHref?: string;
};

const DECOR_PIECES: Array<{ square: number; glyph: string; side: "light" | "dark" }> = [
  { square: 0, glyph: "♜", side: "dark" },
  { square: 9, glyph: "♞", side: "light" },
  { square: 18, glyph: "♝", side: "dark" },
  { square: 25, glyph: "♛", side: "light" },
  { square: 58, glyph: "♚", side: "dark" },
];

export function ChessHero({ config }: { config: ChessHeroConfig }) {
  const stats = config.stats ?? [];
  const cta =
    config.ctaLabel && config.ctaHref
      ? { label: config.ctaLabel, href: config.ctaHref }
      : null;

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-500/20 bg-[#100e0c] text-foreground">
      <div className="grid gap-8 px-6 py-10 md:grid-cols-[1.15fr_0.85fr] md:items-center md:px-10">
        <div>
          {config.eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
              {config.eyebrow}
            </p>
          ) : null}
          <h2 className="mt-3 font-serif text-4xl font-bold leading-tight md:text-5xl">
            {config.title}
          </h2>
          {config.subtitle ? (
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              {config.subtitle}
            </p>
          ) : null}
          {cta ? (
            <a
              href={cta.href}
              className="mt-6 inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/85"
            >
              {cta.label}
            </a>
          ) : null}
        </div>

        <div className="rounded-2xl border border-amber-500/15 bg-white/[0.03] p-5 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Live position
          </p>
          <div
            dir="ltr"
            className="mt-3 grid w-full grid-cols-8 overflow-hidden rounded-lg border border-amber-500/15"
            aria-hidden="true"
          >
            {Array.from({ length: 64 }, (_, index) => {
              const piece = DECOR_PIECES.find((entry) => entry.square === index);
              return (
                <span
                  key={index}
                  className={`flex aspect-square items-center justify-center text-lg ${
                    (index % 8 + Math.floor(index / 8)) % 2 === 0 ? "bg-[#3a342c]" : "bg-[#241f1a]"
                  }`}
                >
                  {piece ? (
                    <span
                      className={
                        piece.side === "light" ? "text-[#f0e7d8]" : "text-[#9c8f7d]"
                      }
                    >
                      {piece.glyph}
                    </span>
                  ) : null}
                </span>
              );
            })}
          </div>

          {stats.length > 0 ? (
            <dl className="mt-5 grid grid-cols-2 gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-xl bg-white/[0.04] p-3 text-start">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</dt>
                  <dd className="mt-1 text-lg font-semibold text-foreground">{stat.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>

      {config.imageUrl ? (
        <Image
          src={config.imageUrl}
          alt={config.title}
          width={1600}
          height={420}
          className="h-64 w-full object-cover"
        />
      ) : null}
    </section>
  );
}
