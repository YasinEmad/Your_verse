import type { ReactNode } from "react";
import {
  DataLine,
  Marquee,
  RealmCard,
  RevealOnView,
  type RealmAccent,
} from "./TechRealmsClient";

export type RealmIcon = "chip" | "orbit" | "wave" | "terminal";

export type TechRealm = {
  title: string;
  blurb: string;
  /** Optional. Without it the card is display-only (no link, no CTA). */
  href?: string;
  icon?: RealmIcon;
  accent?: RealmAccent;
};

export type TechRealmsConfig = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  realms?: TechRealm[];
  ticker?: string[];
};

const DEFAULT_REALMS: TechRealm[] = [
  {
    title: "Keyboards",
    blurb: "Mechanical boards, switches and keycaps — the tactile heart of every desk.",
    href: "/tech/products?category=keyboards",
    icon: "chip",
    accent: "cyan",
  },
  {
    title: "Audio",
    blurb: "Headphones, mics and monitors for people who listen closely and speak clearly.",
    href: "/tech/products?category=audio",
    icon: "wave",
    accent: "violet",
  },
  {
    title: "Displays",
    blurb: "Panels that make code, colour and frames look the way they were meant to.",
    href: "/tech/products?category=displays",
    icon: "orbit",
    accent: "blue",
  },
  {
    title: "All Gear",
    blurb: "Skip the doors and browse the entire Tech World catalogue in one place.",
    href: "/tech/products",
    icon: "terminal",
    accent: "fuchsia",
  },
];

const DEFAULT_TICKER = [
  "Silicon",
  "Signal",
  "Syntax",
  "Circuit",
  "Photon",
  "Protocol",
  "Pixel",
  "Voltage",
];

const ICONS: Record<RealmIcon, ReactNode> = {
  chip: (
    <svg viewBox="0 0 48 48" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="13" y="13" width="22" height="22" rx="3" />
      <rect x="19.5" y="19.5" width="9" height="9" rx="1.5" />
      <path d="M19 6v7M29 6v7M19 35v7M29 35v7M6 19h7M6 29h7M35 19h7M35 29h7" />
    </svg>
  ),
  orbit: (
    <svg viewBox="0 0 48 48" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="24" cy="24" r="4" fill="currentColor" stroke="none" />
      <ellipse cx="24" cy="24" rx="19" ry="7.5" />
      <ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(60 24 24)" />
      <ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(120 24 24)" />
    </svg>
  ),
  wave: (
    <svg viewBox="0 0 48 48" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 24c4-14 8-14 12 0s8 14 12 0 8-14 12 0 4 7 4 7" />
      <path d="M4 40h40" opacity="0.5" />
    </svg>
  ),
  terminal: (
    <svg viewBox="0 0 48 48" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="9" width="38" height="30" rx="4" />
      <path d="M13 20l7 5-7 5" />
      <path d="M24 31h10" />
    </svg>
  ),
};

/**
 * The section that follows the Tech World hero.
 *
 * Server component: layout, copy and icons render on the server; only the
 * interactive pieces (tilt cards, reveals, data line, ticker) are client
 * components from `tech-realms-client.tsx`. Entirely config-driven, with no
 * product data and no network calls.
 */
export function TechRealms({ config = {} }: { config?: TechRealmsConfig }) {
  const realms = config.realms?.length ? config.realms : DEFAULT_REALMS;
  const ticker = config.ticker?.length ? config.ticker : DEFAULT_TICKER;
  const eyebrow = config.eyebrow ?? "// choose your signal";
  const title = config.title ?? "Four doorways. One universe.";
  const subtitle =
    config.subtitle ??
    "Step through whichever one calls to you. Every door opens onto a different corner of the Tech World.";
  const cta = config.ctaLabel ?? "Enter";

  // Accent the last two words of the title.
  const words = title.trim().split(/\s+/);
  const split = Math.max(words.length - 2, 0);
  const lead = words.slice(0, split).join(" ");
  const accent = words.slice(split).join(" ");

  return (
    <section
      id="tech-realms"
      aria-label={title}
      className="relative isolate scroll-mt-24 overflow-hidden bg-background text-foreground"
    >
      {/* ambient backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(34,211,238,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.05)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_50%_35%,black,transparent_72%)]"
      />
      <div
        aria-hidden
        className="absolute -left-40 top-24 -z-10 size-[28rem] rounded-full bg-violet-600/15 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-40 bottom-10 -z-10 size-[28rem] rounded-full bg-cyan-500/15 blur-3xl"
      />

      <div className="mx-auto max-w-6xl px-6 pb-20 pt-24 md:pb-28 md:pt-32">
        <header className="mx-auto max-w-2xl text-center">
          <RevealOnView>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
              {eyebrow}
            </p>
          </RevealOnView>
          <RevealOnView delay={0.1}>
            <h2 className="mt-5 font-mono text-[clamp(2rem,6vw,3.75rem)] font-bold uppercase leading-[1.05] tracking-tight">
              {lead ? <>{lead} </> : null}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 bg-clip-text text-transparent">
                {accent}
              </span>
            </h2>
          </RevealOnView>
          <RevealOnView delay={0.2}>
            <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-slate-400 md:text-lg">
              {subtitle}
            </p>
          </RevealOnView>
        </header>

        <div className="relative mt-16">
          <DataLine className="absolute inset-x-0 -top-6 hidden h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent lg:block" />
          <ul
            role="list"
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {realms.map((r, i) => (
              <RealmCard
                key={r.title}
                index={i}
                title={r.title}
                blurb={r.blurb}
                href={r.href}
                cta={cta}
                accent={r.accent ?? "cyan"}
                icon={ICONS[r.icon ?? "chip"]}
              />
            ))}
          </ul>
        </div>
      </div>

      <Marquee items={ticker} />
    </section>
  );
}