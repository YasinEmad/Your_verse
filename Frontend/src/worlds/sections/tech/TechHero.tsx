import { TechBeamsLayer, TechPortalLayer } from "./TechHeroArt";
import { ExploreButton, Reveal, TechHeroStage } from "./TechHeroStage";

export type TechHeroStat = {
  label: string;
  value: string;
};

export type TechHeroConfig = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Kept so existing section configs still type-check. The hero no longer renders stats. */
  stats?: TechHeroStat[];
  ctaLabel?: string;
  /** Optional link. When omitted, the CTA scrolls to the next section. */
  ctaHref?: string;
  /** Kept for config compatibility; unused by the portal hero. */
  backgroundImageUrl?: string;
  heroImageUrl?: string;
  heroImageAlt?: string;
};

const DEFAULTS = {
  eyebrow: "WELCOME TO YOUR NEXT DIMENSION",
  title: "ENTER THE TECH WORLD",
  subtitle: "A world where technology meets imagination.",
  ctaLabel: "Explore the World",
} as const;

/**
 * Tech World hero: a cinematic portal environment, no products or shopping UI.
 *
 * Server component. All client behaviour (scroll zoom, entrance reveals, the
 * CTA) lives in `TechHeroStage.tsx`; this file only decides what the copy is.
 */
export function TechHero({ config }: { config: TechHeroConfig }) {
  const eyebrow = config.eyebrow ?? DEFAULTS.eyebrow;
  const title = config.title || DEFAULTS.title;
  const subtitle = config.subtitle ?? DEFAULTS.subtitle;
  const ctaLabel = config.ctaLabel ?? DEFAULTS.ctaLabel;
  const ctaHref = config.ctaHref ?? "#tech-realms";

  // Gradient-highlight the last two words ("TECH WORLD"), or the last word.
  const words = title.trim().split(/\s+/);
  const split = words.length > 2 ? words.length - 2 : Math.max(words.length - 1, 0);
  const lead = words.slice(0, split).join(" ");
  const accent = words.slice(split).join(" ");

  return (
    <TechHeroStage portal={<TechPortalLayer />} beams={<TechBeamsLayer />}>
      {eyebrow ? (
        <Reveal delay={0.5}>
          <p className="inline-flex items-center justify-center gap-2.5 text-center font-mono text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-cyan-300 sm:text-xs sm:tracking-[0.4em]">
            <span
              aria-hidden
              className="hidden h-px w-10 bg-gradient-to-r from-transparent to-cyan-300/80 sm:block"
            />
            {eyebrow}
            <span
              aria-hidden
              className="hidden h-px w-10 bg-gradient-to-l from-transparent to-cyan-300/80 sm:block"
            />
          </p>
        </Reveal>
      ) : null}

      <Reveal delay={0.7}>
        <h2 className="mt-5 font-mono text-[clamp(2rem,min(8.5vw,10svh),5.75rem)] font-bold uppercase leading-[1.02] tracking-tight [text-shadow:0_0_40px_rgba(34,211,238,0.35)]">
          {lead ? <span className="block">{lead}</span> : null}
          <span className="block bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 bg-clip-text text-transparent [text-shadow:none]">
            {accent}
          </span>
        </h2>
      </Reveal>

      {subtitle ? (
        <Reveal delay={0.95}>
          <p className="mx-auto mt-5 max-w-md text-balance text-base leading-relaxed text-slate-300 sm:text-lg">
            {subtitle}
          </p>
        </Reveal>
      ) : null}

      <Reveal delay={1.2} className="mt-8">
        <ExploreButton label={ctaLabel} href={ctaHref} />
      </Reveal>
    </TechHeroStage>
  );
}