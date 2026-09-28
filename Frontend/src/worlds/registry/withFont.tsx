import type { CSSProperties, ReactNode } from "react";

export type WorldLayoutProps = {
  children: ReactNode;
  /**
   * The World's own accent colour, as data (frontend-architecture.md §27). It
   * arrives from `themeTokens` and is `undefined` for a World that never defined
   * one.
   *
   * It is deliberately *not* written to `--primary`/`--ring`. Those are
   * contrast-critical — they paint button fills and focus rings against
   * `--primary-foreground` — and a token authored against the old light theme
   * (the seeded Chess World ships `#b45309`, a deep amber) would land on a black
   * canvas as a dark fill under a dark label. The accent is instead rendered as
   * a non-textual glow behind the page, where any colour is safe and a World
   * still reads as its own without an author having to re-pick its hex.
   */
  accent?: string;
};

export type WorldTheme = {
  /**
   * The contrast-checked accent for this World, used for `--primary` and
   * `--ring`. Chosen per World against the dark palette in globals.css, so
   * shadcn primitives inside the World re-tint themselves safely.
   */
  accent: string;
  /** Foreground that stays legible on top of `accent`. */
  onAccent: string;
};

export function worldLayout(
  name: string,
  baseClassName: string,
  fontClassName: string,
  theme: WorldTheme,
) {
  function WorldLayout({ children, accent }: WorldLayoutProps) {
    const style = {
      "--primary": theme.accent,
      "--ring": theme.accent,
      "--primary-foreground": theme.onAccent,
      // Falls back to the World's own accent so a themed World glows its own
      // colour, and to `transparent` (invisible) for one that has no theme token.
      "--world-glow": accent?.trim() || theme.accent,
    } as CSSProperties;

    return (
      <div
        className={`${baseClassName} ${fontClassName} relative isolate`}
        style={style}
      >
        {/*
          A soft wash of the World's own colour from the top of the page. It
          sits behind the sections (`-z-10` inside this element's own stacking
          context) so it only ever fills the gutters between them, and it never
          carries text — which is what makes an unchecked hex safe to use here.
        */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(60rem_38rem_at_50%_-14rem,var(--world-glow),transparent_70%)] opacity-30"
        />
        {children}
      </div>
    );
  }
  WorldLayout.displayName = name;
  return WorldLayout;
}
