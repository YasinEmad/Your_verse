/**
 * Static SVG environment for the Tech World hero: a tunnel of receding arches
 * ending in a glowing portal, plus light beams and data particles.
 *
 * Server components, no client JS. Everything is deterministic so server and
 * client output always match. The two layers are separate so the stage can move
 * them at different speeds for depth.
 */

const VP = { x: 800, y: 655 } as const; // vanishing point (portal centre)
const DOOR = { w: 130, h: 180 } as const;
const FLOOR_Y = VP.y + DOOR.h / 2; // door base sits exactly on the floor line

const CYAN = "#22d3ee";
const BLUE = "#3b82f6";
const VIOLET = "#a855f7";

const r1 = (n: number) => Math.round(n * 10) / 10;

function seeded(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Arch outline centred on the vanishing point. */
function archPath(w: number, h: number, radius: number): string {
  const x0 = VP.x - w / 2;
  const x1 = VP.x + w / 2;
  const y0 = VP.y - h / 2;
  const y1 = VP.y + h / 2;
  const r = Math.min(radius, w / 2, h / 2);
  return [
    `M${r1(x0)} ${r1(y1)}`,
    `V${r1(y0 + r)}`,
    `Q${r1(x0)} ${r1(y0)} ${r1(x0 + r)} ${r1(y0)}`,
    `H${r1(x1 - r)}`,
    `Q${r1(x1)} ${r1(y0)} ${r1(x1)} ${r1(y0 + r)}`,
    `V${r1(y1)}`,
  ].join(" ");
}

const ARCHES = Array.from({ length: 10 }, (_, k) => {
  const f = Math.pow(1.34, k);
  return {
    d: archPath(150 * f, 200 * f, 64 * f),
    stroke: k % 2 === 0 ? BLUE : VIOLET,
    width: r1(1.6 + k * 0.55),
    opacity: r1(Math.max(0.12, 0.95 - k * 0.095)),
    dash: k % 3 === 2 ? "8 12 46 12" : undefined,
  };
});

type Beam = { a: number; r0: number; r1: number; w: number; c: string };

// Angles are in degrees from the vanishing point (0 = right, negative = up).
const BEAM_SEEDS: Beam[] = [
  { a: -152, r0: 360, r1: 780, w: 14, c: CYAN },
  { a: -168, r0: 420, r1: 640, w: 7, c: CYAN },
  { a: -126, r0: 300, r1: 720, w: 8, c: VIOLET },
  { a: -110, r0: 250, r1: 640, w: 5, c: VIOLET },
  { a: -8, r0: 470, r1: 780, w: 5, c: VIOLET },
  { a: 16, r0: 420, r1: 560, w: 9, c: CYAN },
  { a: 34, r0: 300, r1: 430, w: 8, c: CYAN },
];

const BEAMS = BEAM_SEEDS.flatMap((b) => [b, { ...b, a: 180 - b.a }]).map((b) => {
  const rad = (b.a * Math.PI) / 180;
  return {
    x1: r1(VP.x + Math.cos(rad) * b.r0),
    y1: r1(VP.y + Math.sin(rad) * b.r0),
    x2: r1(VP.x + Math.cos(rad) * b.r1),
    y2: r1(VP.y + Math.sin(rad) * b.r1),
    w: b.w,
    c: b.c,
  };
});

const PARTICLES = (() => {
  const rnd = seeded(7);
  return Array.from({ length: 110 }, () => {
    const left = rnd() > 0.5;
    const x = left ? rnd() * 260 : 1340 + rnd() * 260;
    return {
      x: r1(x),
      y: r1(60 + rnd() * 780),
      r: r1(0.8 + rnd() * 2.2),
      o: r1(0.25 + rnd() * 0.6),
      c: rnd() > 0.35 ? VIOLET : CYAN,
    };
  });
})();

const FLOOR_V = Array.from({ length: 13 }, (_, i) => {
  const xe = -800 + i * 250;
  return {
    x1: r1(VP.x + (xe - VP.x) * 0.1),
    x2: xe,
  };
});

const FLOOR_H = Array.from({ length: 8 }, (_, i) => {
  const t = (i + 1) / 8;
  return { y: r1(FLOOR_Y + 260 * t * t), o: r1(0.12 + t * 0.3) };
});

const svgProps = {
  "aria-hidden": true,
  viewBox: "0 0 1600 900",
  preserveAspectRatio: "xMidYMid slice",
  className: "absolute inset-0 size-full",
} as const;

/** Far layer: arches, portal door, floor. Zooms hardest on scroll. */
export function TechPortalLayer() {
  return (
    <svg {...svgProps}>
      <defs>
        <radialGradient id="th-vignette" cx="50%" cy="73%" r="62%">
          <stop offset="0%" stopColor="#0a1433" />
          <stop offset="55%" stopColor="#070a1a" />
          <stop offset="100%" stopColor="#03040b" />
        </radialGradient>
        <linearGradient id="th-door" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#02030a" />
          <stop offset="62%" stopColor="#04102c" />
          <stop offset="100%" stopColor={CYAN} stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id="th-floor-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={CYAN} stopOpacity="0.9" />
          <stop offset="100%" stopColor={CYAN} stopOpacity="0" />
        </radialGradient>
        <filter id="th-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      <rect width="1600" height="900" fill="url(#th-vignette)" />

      {/* arches, blurred copy underneath for glow */}
      <g fill="none" strokeLinejoin="round">
        <g filter="url(#th-blur)">
          {ARCHES.slice(0, 6).map((a, i) => (
            <path
              key={i}
              d={a.d}
              stroke={a.stroke}
              strokeWidth={a.width * 2}
              opacity={a.opacity * 0.6}
            />
          ))}
        </g>
        {ARCHES.map((a, i) => (
          <path
            key={i}
            d={a.d}
            stroke={a.stroke}
            strokeWidth={a.width}
            strokeDasharray={a.dash}
            opacity={a.opacity}
          />
        ))}
      </g>

      {/* floor */}
      <g stroke={CYAN} strokeWidth="1" fill="none">
        {FLOOR_V.map((l, i) => (
          <line
            key={i}
            x1={l.x1}
            y1={FLOOR_Y}
            x2={l.x2}
            y2={900}
            opacity="0.22"
          />
        ))}
        {FLOOR_H.map((l, i) => (
          <line
            key={i}
            x1="0"
            y1={l.y}
            x2="1600"
            y2={l.y}
            opacity={l.o}
          />
        ))}
      </g>

      {/* portal */}
      <ellipse
        cx={VP.x}
        cy={FLOOR_Y + 4}
        rx="200"
        ry="28"
        fill="url(#th-floor-glow)"
      />
      <path
        d={`${archPath(DOOR.w, DOOR.h, 54)} V${FLOOR_Y} Z`}
        fill="url(#th-door)"
        stroke={CYAN}
        strokeWidth="2.5"
        filter="url(#th-blur)"
        opacity="0.8"
      />
      <path
        d={`${archPath(DOOR.w, DOOR.h, 54)} V${FLOOR_Y} Z`}
        fill="url(#th-door)"
        stroke="#67e8f9"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** Near layer: light beams and data particles. Moves less than the portal. */
export function TechBeamsLayer() {
  return (
    <svg {...svgProps}>
      <defs>
        <filter id="th-beam-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g strokeLinecap="round" filter="url(#th-beam-glow)">
        {BEAMS.map((b, i) => (
          <line
            key={i}
            x1={b.x1}
            y1={b.y1}
            x2={b.x2}
            y2={b.y2}
            stroke={b.c}
            strokeWidth={b.w}
            opacity="0.85"
          />
        ))}
      </g>
      <g>
        {PARTICLES.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.c} opacity={p.o} />
        ))}
      </g>
    </svg>
  );
}