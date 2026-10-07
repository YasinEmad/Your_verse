"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { PublicWorld } from "@/lib/api/worlds";
import { WorldCard } from "@/components/worlds/WorldCard";
import { imageForWorld } from "@/components/worlds/WorldImages";

type WorldSectionProps = {
  worlds: PublicWorld[];
};

type WorldCarouselProps = {
  label: string;
  children: ReactNode;
};

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "left" ? (
        <path d="M15 5l-7 7 7 7" />
      ) : (
        <path d="M9 5l7 7-7 7" />
      )}
    </svg>
  );
}

export function WorldSection({ worlds }: WorldSectionProps) {
  if (worlds.length === 0) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 pb-8 pt-8 md:px-8">
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
          <h2 className="text-2xl font-light tracking-[-0.04em] text-foreground">
            No worlds yet
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            New worlds will appear here as soon as they are activated.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-8 pt-8 md:px-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.28em] text-muted-foreground" style={{ fontFamily: '"Isometra", "Segoe UI", sans-serif' }}>
            Choose
          </p>
          <h2 className="mt-2 text-3xl font-light tracking-[-0.06em] text-foreground" style={{ fontFamily: '"Isometra", "Segoe UI", sans-serif' }}>
            Your verse
          </h2>
        </div>
      </div>

      <WorldCarousel label="World list">
        {worlds.map((world) => (
          <li key={world.slug} className="list-none">
            <WorldCard world={world} image={imageForWorld(world.slug)} />
          </li>
        ))}
      </WorldCarousel>
    </section>
  );
}

export function WorldCarousel({ label, children }: WorldCarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const frame = useRef<number | null>(null);
  const [state, setState] = useState({
    canPrev: false,
    canNext: false,
    start: 0,
    size: 1,
    scrolled: false,
  });

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const size = el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1;
    const start = max > 0 ? (el.scrollLeft / el.scrollWidth) : 0;
    setState((prev) => ({
      canPrev: el.scrollLeft > 4,
      canNext: el.scrollLeft < max - 4,
      start,
      size: Math.min(1, size),
      scrolled: prev.scrolled || el.scrollLeft > 24,
    }));
  }, []);

  const schedule = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      measure();
    });
  }, [measure]);

  useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [measure, schedule]);

  const scrollByPage = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: dir * el.clientWidth * 0.85,
      behavior: reduce ? "auto" : "smooth",
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByPage(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByPage(-1);
    }
  };

  const buttonClass =
    "grid size-10 place-items-center rounded-full border border-border bg-background/60 text-foreground backdrop-blur transition-all outline-none hover:border-foreground/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        role="list"
        tabIndex={0}
        aria-label={label}
        onScroll={schedule}
        onKeyDown={onKeyDown}
        className="relative -mx-4 flex snap-x snap-mandatory items-start gap-5 overflow-x-auto overscroll-x-contain scroll-smooth scroll-px-4 px-4 pb-6 pt-1 outline-none [mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-2rem),transparent)] [scrollbar-width:none] motion-reduce:scroll-auto md:-mx-8 md:scroll-px-8 md:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>

      <div className="mt-2 flex items-center gap-4">
        {/* progress track */}
        <div
          aria-hidden
          className="relative h-px flex-1 bg-border"
        >
          <span
            className="absolute -top-px h-[3px] rounded-full bg-foreground/70 transition-[left,width] duration-200 ease-out"
            style={{
              left: `${state.start * 100}%`,
              width: `${state.size * 100}%`,
            }}
          />
        </div>

        {/* mobile hint, fades once the user scrolls */}
        <span
          aria-hidden
          className={`font-mono text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground transition-opacity duration-500 md:hidden ${
            state.scrolled || !state.canNext ? "opacity-0" : "opacity-100"
          }`}
        >
          Swipe →
        </span>

        {/* desktop controls */}
        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            aria-label="Previous worlds"
            disabled={!state.canPrev}
            onClick={() => scrollByPage(-1)}
            className={buttonClass}
          >
            <Arrow direction="left" />
          </button>
          <button
            type="button"
            aria-label="Next worlds"
            disabled={!state.canNext}
            onClick={() => scrollByPage(1)}
            className={buttonClass}
          >
            <Arrow direction="right" />
          </button>
        </div>
      </div>
    </div>
  );
}