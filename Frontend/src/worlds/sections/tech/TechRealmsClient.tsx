"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import type { CSSProperties, PointerEvent, ReactNode } from "react";

/** Fades/lifts its children in once, when they scroll into view. */
export function RevealOnView({
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
      initial={reduce ? false : { opacity: 0, y: 36, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** A thin glowing line that draws itself across the screen on entry. */
export function DataLine({ className }: { className?: string }) {
  const reduce = useReducedMotion() === true;
  return (
    <motion.div
      aria-hidden
      className={className}
      style={{ transformOrigin: "left center" }}
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}

export type RealmAccent = "cyan" | "violet" | "blue" | "fuchsia";

const ACCENT_RGB: Record<RealmAccent, string> = {
  cyan: "34 211 238",
  violet: "168 85 247",
  blue: "59 130 246",
  fuchsia: "232 121 249",
};

/**
 * Holographic doorway card: scroll-in reveal, 3D tilt that follows the pointer
 * (springy, no re-renders), and a spotlight that tracks the cursor via CSS
 * variables. Tilt is disabled for reduced motion; the card is a real link only
 * when an `href` is configured.
 */
export function RealmCard({
  index,
  title,
  blurb,
  href,
  cta,
  accent,
  icon,
}: {
  index: number;
  title: string;
  blurb: string;
  href?: string;
  cta: string;
  accent: RealmAccent;
  icon: ReactNode;
}) {
  const reduce = useReducedMotion() === true;
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 220, damping: 22 });
  const sy = useSpring(py, { stiffness: 220, damping: 22 });
  const rotateY = useTransform(sx, [0, 1], [-10, 10]);
  const rotateX = useTransform(sy, [0, 1], [10, -10]);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    e.currentTarget.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    e.currentTarget.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    if (!reduce) {
      px.set(x);
      py.set(y);
    }
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  const vars = {
    "--accent": ACCENT_RGB[accent],
    "--mx": "50%",
    "--my": "30%",
  } as CSSProperties;

  const body = (
    <>
      {/* cursor spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
        style={{
          background:
            "radial-gradient(360px circle at var(--mx) var(--my), rgb(var(--accent) / 0.22), transparent 62%)",
        }}
      />
      {/* faint scanlines */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.025)_0,rgba(255,255,255,0.025)_1px,transparent_1px,transparent_4px)]"
      />
      {/* corner brackets */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-3 size-3 border-l border-t border-[rgb(var(--accent)/0.7)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-3 right-3 size-3 border-b border-r border-[rgb(var(--accent)/0.7)]"
      />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <span
            aria-hidden
            className="font-mono text-6xl font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgb(var(--accent)/0.4)]"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="grid size-14 place-items-center rounded-xl border border-[rgb(var(--accent)/0.35)] bg-[rgb(var(--accent)/0.08)] text-[rgb(var(--accent))] shadow-[0_0_30px_-8px_rgb(var(--accent)/0.8)] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 motion-reduce:transition-none">
            {icon}
          </span>
        </div>

        <h3 className="mt-10 font-mono text-xl font-bold uppercase tracking-wide text-foreground">
          {title}
        </h3>
        <p className="mt-3 mb-6 text-sm leading-relaxed text-slate-400">{blurb}</p>

        {href ? (
          <span className="mt-auto inline-flex items-center gap-2 pt-8 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent))]">
            {cta}
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1.5 motion-reduce:transition-none"
            >
              →
            </span>
          </span>
        ) : null}
      </div>
    </>
  );

  const shell =
    "group relative block h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 backdrop-blur-sm transition-colors duration-300 hover:border-[rgb(var(--accent)/0.55)] focus-visible:border-[rgb(var(--accent)/0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.6)]";

  return (
    <motion.li
      className="[perspective:1000px]"
      initial={reduce ? false : { opacity: 0, y: 56, rotateX: -14 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{
        duration: 0.9,
        delay: index * 0.12,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <motion.div
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{
          ...vars,
          rotateX: reduce ? 0 : rotateX,
          rotateY: reduce ? 0 : rotateY,
          transformPerspective: 1000,
        }}
        className="h-full will-change-transform"
      >
        {href ? (
          <a href={href} className={shell}>
            {body}
          </a>
        ) : (
          <div className={shell}>{body}</div>
        )}
      </motion.div>
    </motion.li>
  );
}

/** Slow infinite ticker of short words. Static when reduced motion is on. */
export function Marquee({ items }: { items: readonly string[] }) {
  const reduce = useReducedMotion() === true;
  const row = (
    <span className="flex shrink-0 items-center gap-8 pr-8">
      {items.map((w, i) => (
        <span key={`${w}-${i}`} className="flex items-center gap-8">
          <span>{w}</span>
          <span aria-hidden className="text-cyan-400/60">
            ✦
          </span>
        </span>
      ))}
    </span>
  );

  return (
    <div
      aria-hidden
      className="overflow-hidden border-y border-white/10 py-4 font-mono text-xs uppercase tracking-[0.4em] text-slate-500 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
    >
      <motion.div
        className="flex w-max"
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
      >
        {row}
        {row}
        {row}
        {row}
      </motion.div>
    </div>
  );
}