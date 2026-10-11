"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * Client-side stage for the Tech World hero.
 *
 * Scroll model: the section is taller than the viewport and its inner frame is
 * `sticky` only while the section is on screen. Scroll progress through the
 * section zooms the environment toward the portal, fades the copy out and
 * washes the frame to the page background. When the section ends, the sticky
 * frame releases and the next section scrolls in normally: no fixed
 * positioning, no gap, no overlap.
 *
 * Progress drives motion values directly (no React re-renders). With reduced
 * motion the section is exactly one viewport tall, nothing is pinned and no
 * transform is applied.
 */
export function TechHeroStage({
  portal,
  beams,
  children,
}: {
  portal: ReactNode;
  beams: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion() === true;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const portalScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 3.4]);
  const beamsScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.7]);
  const beamsOpacity = useTransform(scrollYProgress, [0.2, 0.8], [1, reduce ? 1 : 0]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.4], [1, reduce ? 1 : 0]);
  const copyY = useTransform(scrollYProgress, [0, 0.4], [0, reduce ? 0 : -72]);
  const veilOpacity = useTransform(scrollYProgress, [0.55, 1], [0, reduce ? 0 : 1]);

  return (
    <section
      ref={ref}
      data-tech-hero
      className="relative h-[150svh] bg-[#05060f] text-foreground md:h-[190svh] motion-reduce:h-svh md:motion-reduce:h-svh"
    >
      <div className="sticky top-0 h-svh overflow-hidden motion-reduce:static">
        {/* environment */}
        <motion.div
          aria-hidden
          style={{ scale: portalScale, transformOrigin: "50% 73%" }}
          className="absolute inset-0 will-change-transform"
        >
          <motion.div
            className="absolute inset-0"
            initial={reduce ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {portal}
          </motion.div>
          {/* slow breathing glow behind the door */}
          <motion.div
            className="absolute left-1/2 top-[73%] size-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/20 blur-3xl"
            animate={reduce ? undefined : { scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        <motion.div
          aria-hidden
          style={{
            scale: beamsScale,
            opacity: beamsOpacity,
            transformOrigin: "50% 73%",
          }}
          className="absolute inset-0 will-change-transform"
        >
          <motion.div
            className="absolute inset-0"
            initial={reduce ? false : { opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: [0.7, 1, 0.7] }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 6, repeat: Infinity, ease: "easeInOut" }
            }
          >
            {beams}
          </motion.div>
        </motion.div>

        {/* legibility scrim behind the copy */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_26%,rgba(3,4,11,0.88),transparent_62%)]"
        />

        {/* copy */}
        <motion.div
          style={{ opacity: copyOpacity, y: copyY }}
          className="relative z-10 flex h-full flex-col items-center px-6 pt-[15svh] text-center md:pt-[12svh]"
        >
          {children}
        </motion.div>

        {/* wash to page background so the handoff has no seam */}
        <motion.div
          aria-hidden
          style={{ opacity: veilOpacity }}
          className="pointer-events-none absolute inset-0 bg-background"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background"
        />
      </div>
    </section>
  );
}

/** Staggered entrance for a piece of hero copy. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion() === true;
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

const ctaClass =
  "group inline-flex items-center gap-2 rounded-full border border-cyan-300/60 bg-cyan-400 px-7 py-3 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-[#04212b] shadow-[0_0_40px_-6px] shadow-cyan-400/80 outline-none transition hover:bg-cyan-300 focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060f]";

const arrow = (
  <span
    aria-hidden
    className="transition-transform duration-300 group-hover:translate-y-0.5 motion-reduce:transition-none"
  >
    ↓
  </span>
);

/**
 * Primary CTA. With a configured `href` it is a plain link; otherwise it
 * scrolls to where the next section starts (the bottom edge of the hero), so
 * no destination has to be invented.
 */
export function ExploreButton({
  label,
  href,
}: {
  label: string;
  href?: string;
}) {
  const reduce = useReducedMotion() === true;

  if (href) {
    return (
      <a href={href} className={ctaClass}>
        {label}
        {arrow}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={ctaClass}
      onClick={(e) => {
        const hero = e.currentTarget.closest("[data-tech-hero]");
        if (!hero) return;
        const bottom = window.scrollY + hero.getBoundingClientRect().bottom;
        window.scrollTo({ top: bottom, behavior: reduce ? "auto" : "smooth" });
      }}
    >
      {label}
      {arrow}
    </button>
  );
}