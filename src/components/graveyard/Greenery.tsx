import type { CSSProperties } from "react";

/** Small seeded PRNG so every grave grows the same grass on every render. */
function seeded(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type RGB = [number, number, number];

function mix(a: RGB, b: RGB, k: number): RGB {
  return [0, 1, 2].map((i) => Math.round(a[i]! + (b[i]! - a[i]!) * k)) as RGB;
}

const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;

/**
 * Round SVG coordinates: Math.sin/cos can differ in the last digit between
 * the server and the browser, which breaks hydration.
 */
const r2 = (n: number) => Math.round(n * 100) / 100;

// Colours as moonlight shows them: dead grass is grey-brown, living grass a deep green.
const DEAD: RGB = [44, 42, 38];
const DRY: RGB = [66, 64, 52];
const GREEN: RGB = [38, 88, 52];
const LUSH: RGB = [74, 142, 78];
const PETALS = ["#ff8fb1", "#ffd36e", "#b9a2ff", "#f4f6ff", "#ff9e6b"];

const W = 200;
const H = 34;

/**
 * Grass, twigs and flowers at the foot of a grave. `life` 0..1 drives it:
 * dead graves have short, brown, broken stubs; every fixed quest grows the
 * grass greener and taller; flowers open one by one; on resurrection it all
 * blooms and sways.
 */
export function Greenery({ life, seed, risen, className = "", style }: { life: number; seed: number; risen: boolean; className?: string; style?: CSSProperties }) {
  const rnd = seeded(seed + 1);
  const blades = Array.from({ length: 120 }, (_, i) => {
    const x = (i / 120) * W + rnd() * 4 - 2;
    const h = 5 + rnd() * rnd() * 26;
    const bend = (rnd() - 0.5) * 7;
    const tone = rnd();
    return { x, h, bend, tone, delay: rnd() * -3 };
  });
  const flowers = Array.from({ length: 7 }, (_, i) => ({
    x: 14 + (i / 7) * (W - 28) + rnd() * 14,
    h: 12 + rnd() * 12,
    color: PETALS[Math.floor(rnd() * PETALS.length)]!,
    // Each flower opens at its own point on the way back to life.
    at: 0.15 + (i / 7) * 0.8 + rnd() * 0.05,
  }));
  const twigs = Array.from({ length: 6 }, () => {
    const x = rnd() * W;
    const a = ((rnd() - 0.5) * 70 * Math.PI) / 180;
    const l = 6 + rnd() * 8;
    return { x1: r2(x), x2: r2(x + Math.sin(a) * l), y2: r2(H - 1 - Math.cos(a) * l * 0.5) };
  });

  const growth = 0.28 + 0.72 * life;
  const deadness = Math.max(0, 1 - life * 2.5);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`rv-greenery pointer-events-none ${className}`}
      style={style}
      data-risen={risen}
      aria-hidden="true"
    >
      {/* dead twigs and leaves, which fade away as life returns */}
      <g opacity={deadness}>
        {twigs.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={H - 1}
            x2={t.x2}
            y2={t.y2}
            stroke="#3b3128"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        ))}
      </g>

      <g className="rv-grass" style={{ transform: `scaleY(${growth.toFixed(3)})` }}>
        {blades.map((b, i) => {
          // Each blade blends from its dead colour to its living colour by life.
          const color = css(mix(mix(DEAD, DRY, b.tone), mix(GREEN, LUSH, b.tone), life));
          return (
            <path
              key={i}
              className="rv-blade"
              d={`M${b.x.toFixed(1)} ${H} Q${(b.x + b.bend * 0.4).toFixed(1)} ${(H - b.h * 0.55).toFixed(1)} ${(b.x + b.bend).toFixed(1)} ${(H - b.h).toFixed(1)}`}
              stroke={color}
              strokeWidth={1.1}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              fill="none"
              style={{ animationDelay: `${b.delay.toFixed(2)}s`, transformOrigin: `${b.x.toFixed(1)}px ${H}px` }}
            />
          );
        })}
      </g>

      {flowers.map((f, i) => {
        const open = life >= f.at || risen;
        return (
          <g key={i} className="rv-flower" data-open={open} style={{ transformOrigin: `${f.x.toFixed(1)}px ${H}px`, transitionDelay: `${i * 90}ms` }}>
            <line x1={r2(f.x)} y1={H} x2={r2(f.x)} y2={r2(H - f.h)} stroke="#3f9a55" strokeWidth="1.1" />
            {[0, 72, 144, 216, 288].map((a) => (
              <circle
                key={a}
                cx={r2(f.x + Math.cos((a * Math.PI) / 180) * 2.2)}
                cy={r2(H - f.h + Math.sin((a * Math.PI) / 180) * 2.2)}
                r={1.4}
                fill={f.color}
              />
            ))}
            <circle cx={r2(f.x)} cy={r2(H - f.h)} r={1.3} fill="#ffe08a" />
          </g>
        );
      })}
    </svg>
  );
}
