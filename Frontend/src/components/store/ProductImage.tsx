"use client";

import { useState } from "react";

/**
 * Renders a product photo with a graceful fallback: the seed catalog points at
 * example.com URLs that may not resolve, so the box keeps a gradient base
 * underneath and swaps the broken image for it without layout shift.
 */
export function ProductImage({
  imageUrl,
  alt = "",
  className = "aspect-square",
}: {
  imageUrl?: string | null;
  alt?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <div
        aria-hidden="true"
        className={`${className} grid place-items-center bg-gradient-to-br from-slate-800 to-slate-900`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="size-8 text-muted-foreground/40"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0021.75 19.5V4.5A1.5 1.5 0 0020.25 3H3.75A1.5 1.5 0 002.25 4.5v15A1.5 1.5 0 003.75 21z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`${className} overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote seed photos are not in the Next image allowlist */}
      <img
        src={imageUrl}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}