import type { CSSProperties } from "react";
import { seeded } from "@/lib/haunt/mood";

/*
 * Background graves and the far horizon: they belong to no project and can't
 * be opened. They fill the yard out so the named graves stand in a real
 * cemetery rather than on an empty lawn.
 */

const OLD_SHAPES = [
  { vb: "0 0 60 80", d: "M8 80 V30 A22 22 0 0 1 52 30 V80 Z" }, // small round stone
  { vb: "0 0 60 80", d: "M25 80 V36 H8 V24 H25 V4 H35 V24 H52 V36 H35 V80 Z" }, // stone cross
  { vb: "0 0 60 80", d: "M8 80 V34 L20 26 L27 36 L36 22 L52 30 V80 Z" }, // broken stone
  { vb: "0 0 60 80", d: "M10 80 V22 Q10 8 30 6 Q50 8 50 22 V80 Z" }, // tall tablet
];

/** A nameless old stone, worn smooth, leaning a little. */
export function OldStone({ variant, lean, silhouette = false, style }: { variant: number; lean: number; silhouette?: boolean; style?: CSSProperties }) {
  const s = OLD_SHAPES[variant % OLD_SHAPES.length]!;
  if (silhouette) {
    // Right in front of you: just a dark shape with a rim of moonlight.
    return (
      <svg viewBox={s.vb} className="rv-oldstone absolute overflow-visible" style={style} aria-hidden="true">
        <g style={{ transform: `rotate(${lean}deg)`, transformOrigin: "30px 80px" }}>
          <path d={s.d} fill="rgba(140,160,215,0.25)" transform="translate(0.8 -0.8)" />
          <path d={s.d} fill="#020306" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox={s.vb} className="rv-oldstone absolute overflow-visible" style={style} aria-hidden="true">
      <g style={{ transform: `rotate(${lean}deg)`, transformOrigin: "30px 80px" }}>
        <path d={s.d} transform="translate(4 -2)" fill="url(#rv-g-side)" filter="url(#rv-stone)" />
        <path d={s.d} fill="url(#rv-g-stone)" filter="url(#rv-stone)" />
        <g filter="url(#rv-lichen)" opacity="0.7">
          <path d={s.d} fill="#fff" />
        </g>
        <g filter="url(#rv-moss)" mask="url(#rv-m-low)">
          <path d={s.d} fill="#fff" />
        </g>
      </g>
    </svg>
  );
}

/**
 * The far edge of the cemetery: a low ridge with rows of tiny crosses and
 * stones, an iron fence, a chapel and bare trees, all in silhouette with
 * moonlight on their upper edges.
 */
export function Horizon({ className = "", style }: { className?: string; style?: CSSProperties }) {
  const crosses = Array.from({ length: 34 }, (_, i) => {
    const x = 20 + i * 41 + ((i * 37) % 17);
    const y = 92 + Math.round(Math.sin(i * 1.7) * 4);
    const tall = 10 + ((i * 13) % 9);
    return i % 3 === 0
      ? `M${x - 1} ${y} V${y - tall} M${x - 5} ${y - tall + 4} H${x + 4}`
      : `M${x - 4} ${y} V${y - tall + 4} Q${x} ${y - tall - 1} ${x + 4} ${y - tall + 4} V${y} Z`;
  });
  const fence = Array.from({ length: 70 }, (_, i) => `M${700 + i * 11} 108 V${96 - (i % 2) * 2} l1.5 -3 l1.5 3`).join(" ");
  return (
    <svg viewBox="0 0 1440 160" preserveAspectRatio="xMidYMax slice" className={`rv-horizon ${className}`} style={style} aria-hidden="true">
      {/* far ridge */}
      <path d="M0 96 C 180 78 320 88 480 82 C 640 76 760 90 920 84 C 1100 78 1260 92 1440 80 V160 H0 Z" fill="#0b1222" />
      {/* chapel with bell tower */}
      <path
        d="M1080 86 V48 L1112 22 L1144 48 V86 Z M1144 86 V58 H1196 V86 Z M1104 34 V8 H1120 V34 Z M1110 8 V-2 M1106 2 H1116"
        fill="#090f1d"
        stroke="#090f1d"
        strokeWidth="2"
      />
      <path d="M1108 60 h8 v14 h-8 Z M1160 66 h6 v10 h-6 Z M1178 66 h6 v10 h-6 Z" fill="#3a2f1c" opacity="0.9" />
      {/* bare trees */}
      <path
        d="M240 90 V58 M240 70 L226 54 M240 64 L254 48 M226 54 L220 46 M254 48 L262 44 M240 58 L244 40 M1290 88 V50 M1290 66 L1276 50 M1290 58 L1306 42 M1276 50 L1270 40 M1306 42 L1314 38"
        fill="none"
        stroke="#0a1120"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* rows of graves on the ridge */}
      <path d={crosses.join(" ")} fill="#0a1121" stroke="#0a1121" strokeWidth="2" />
      {/* iron fence */}
      <path d={`M700 99 H1470 M700 104 H1470 ${fence}`} fill="none" stroke="#0a1120" strokeWidth="1.4" />
      {/* near ridge, a touch lighter where the fog lies on it */}
      <path d="M0 118 C 220 104 420 116 640 110 C 860 104 1060 118 1240 112 C 1340 108 1400 112 1440 110 V160 H0 Z" fill="#0a101d" />
    </svg>
  );
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** A strip of rough grass along a row, so the stones stand in the turf rather than on it. */
export function Turf({ seed, className = "", style }: { seed: number; className?: string; style?: CSSProperties }) {
  const rnd = seeded(seed);
  const W = 1000;
  const H = 30;
  let d = `M0 ${H}`;
  for (let x = 0; x <= W; x += 2.5 + rnd() * 4) {
    const h = 3 + rnd() * rnd() * 25;
    const b = (rnd() - 0.5) * 7;
    d += ` L${r2(x)} ${H - 3} L${r2(x + b + 1)} ${r2(H - h)} L${r2(x + 2)} ${H - 3}`;
  }
  d += ` L${W} ${H} Z`;
  const leaves = Array.from({ length: 46 }, () => ({
    x: r2(rnd() * W),
    y: r2(H - 1 - rnd() * 5),
    a: Math.round(rnd() * 180),
    c: ["#5a2c10", "#6e3a12", "#4a2410", "#7a4a1a"][Math.floor(rnd() * 4)]!,
  }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={`rv-turf ${className}`} style={style} aria-hidden="true">
      <path d={d} fill="url(#rv-g-turf)" />
      <path d={d} fill="none" stroke="rgba(120,142,195,0.14)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      {/* fallen leaves */}
      {leaves.map((l, i) => (
        <ellipse key={i} cx={l.x} cy={l.y} rx="3.2" ry="1.5" fill={l.c} opacity="0.75" transform={`rotate(${l.a} ${l.x} ${l.y})`} />
      ))}
    </svg>
  );
}

export type GroundPlot = { x: number; y: number; w: number; /** height, for its moon shadow */ h?: number };

/**
 * The ground in perspective: terrain fading into fog at the horizon, a
 * winding dirt path from your feet to the far gate, a dark earth plot under
 * everything that stands on it (so nothing floats), grass tufts that shrink
 * with distance, and fallen leaves along the path. Static: drawn once.
 */
export function PerspectiveGround({
  width,
  height,
  horizon,
  path,
  plots,
  tufts,
  leaves,
}: {
  width: number;
  height: number;
  horizon: number;
  /** Path edges, near to far: [left, right] screen points. */
  path: [[number, number], [number, number]][];
  plots: GroundPlot[];
  tufts: { x: number; y: number; s: number }[];
  leaves: { x: number; y: number; s: number; a: number; c: string }[];
}) {
  const left = path.map(([l]) => `${r2(l[0])} ${r2(l[1])}`);
  const right = path.map(([, r]) => `${r2(r[0])} ${r2(r[1])}`).reverse();
  const road = `M${left.join(" L")} L${right.join(" L")} Z`;
  const edges = `M${left.join(" L")} M${path.map(([, r]) => `${r2(r[0])} ${r2(r[1])}`).join(" L")}`;
  const grass = tufts
    .map(({ x, y, s }) => {
      const h = 7 * s;
      return `M${r2(x - 2 * s)} ${r2(y)} q${r2(-s)} ${r2(-h * 0.6)} ${r2(-2.5 * s)} ${r2(-h)} M${r2(x)} ${r2(y)} q0 ${r2(-h * 0.7)} ${r2(s)} ${r2(-h * 1.2)} M${r2(x + 2 * s)} ${r2(y)} q${r2(s)} ${r2(-h * 0.5)} ${r2(3 * s)} ${r2(-h * 0.8)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="rv-ground absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="rv-g-earth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a3349" />
          <stop offset="0.08" stopColor="#161d2b" />
          <stop offset="0.4" stopColor="#0b0f17" />
          <stop offset="1" stopColor="#040509" />
        </linearGradient>
        <linearGradient id="rv-g-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3c4456" />
          <stop offset="0.25" stopColor="#2a2a2e" />
          <stop offset="1" stopColor="#1a1612" />
        </linearGradient>
        <linearGradient id="rv-g-cast" x1="1" y1="0" x2="0" y2="0.4">
          <stop offset="0" stopColor="#010103" stopOpacity="0.75" />
          <stop offset="1" stopColor="#010103" stopOpacity="0" />
        </linearGradient>
        <filter id="rv-soft-shadow" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <radialGradient id="rv-g-plot">
          <stop offset="0" stopColor="#020203" stopOpacity="0.95" />
          <stop offset="0.6" stopColor="#05060a" stopOpacity="0.7" />
          <stop offset="1" stopColor="#05060a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y={r2(horizon - 4)} width={width} height={r2(height - horizon + 4)} fill="url(#rv-g-earth)" />
      {/* gentle swells in the ground */}
      <path
        d={`M0 ${r2(horizon + (height - horizon) * 0.3)} C ${r2(width * 0.25)} ${r2(horizon + (height - horizon) * 0.2)} ${r2(width * 0.4)} ${r2(horizon + (height - horizon) * 0.38)} ${r2(width * 0.6)} ${r2(horizon + (height - horizon) * 0.3)} S ${r2(width * 0.9)} ${r2(horizon + (height - horizon) * 0.22)} ${width} ${r2(horizon + (height - horizon) * 0.32)} V${height} H0 Z`}
        fill="rgba(0,0,0,0.22)"
      />
      <path d={road} fill="url(#rv-g-road)" filter="url(#rv-soil)" />
      <path d={edges} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="2" />
      {/* moon shadows: long and soft, falling toward you and to the left */}
      <g filter="url(#rv-soft-shadow)">
        {plots
          .filter((p) => p.h)
          .map((p, i) => {
            const L = p.h! * 0.75;
            const l = p.x - p.w * 0.42;
            const r = p.x + p.w * 0.42;
            return <path key={i} d={`M${r2(l)} ${r2(p.y)} L${r2(r)} ${r2(p.y)} L${r2(r - L * 0.9)} ${r2(p.y + L * 0.2)} L${r2(l - L * 0.9)} ${r2(p.y + L * 0.2)} Z`} fill="url(#rv-g-cast)" />;
          })}
      </g>
      {plots.map((p, i) => (
        <ellipse key={i} cx={r2(p.x)} cy={r2(p.y)} rx={r2(p.w * 0.62)} ry={r2(p.w * 0.14)} fill="url(#rv-g-plot)" />
      ))}
      <path d={grass} fill="none" stroke="#070b09" strokeWidth="1" strokeLinecap="round" />
      <path d={grass} fill="none" stroke="rgba(120,140,190,0.1)" strokeWidth="0.5" transform="translate(0.6 -0.6)" />
      {leaves.map((l, i) => (
        <ellipse key={i} cx={r2(l.x)} cy={r2(l.y)} rx={r2(3.4 * l.s)} ry={r2(1.5 * l.s)} fill={l.c} opacity="0.7" transform={`rotate(${l.a} ${r2(l.x)} ${r2(l.y)})`} />
      ))}
    </svg>
  );
}
