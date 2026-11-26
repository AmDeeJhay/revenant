import type { CSSProperties } from "react";

/*
 * Halloween dressing for the graveyard: carved pumpkins, skulls, crows,
 * cobwebs, bats, an iron fence strung with lights, and the hooded
 * lantern-bearer who finds graves for you. Drawn as SVG and lit to match
 * the moonlit stone; colours come from gradients in <StoneDefs />.
 */

const r2 = (n: number) => Math.round(n * 100) / 100;

/** A pumpkin; carved ones glow and flicker from the candle inside. */
export function Pumpkin({ carved = true, className = "", style }: { carved?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <span className={`rv-pumpkin ${className}`} data-carved={carved} style={style} aria-hidden="true">
      <svg viewBox="0 0 64 52" className="relative block h-full w-full overflow-visible">
        {[
          [14, 31, 13, 18],
          [50, 31, 13, 18],
          [23, 31, 13, 20],
          [41, 31, 13, 20],
          [32, 31, 14, 21],
        ].map(([cx, cy, rx, ry], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#rv-g-pumpkin)" stroke="rgba(40,12,0,0.55)" strokeWidth="0.7" />
        ))}
        <ellipse cx="42" cy="20" rx="7" ry="4" fill="rgba(255,235,200,0.12)" />
        <path d="M30 12 C30 6 33 3 37 2 L38 4 C35 6 34 8 34 12 Z" fill="#3b3a1f" />
        {carved && (
          <path
            className="rv-pumpkin-face"
            d="M19 26 L27 26 L23 19 Z M37 26 L45 26 L41 19 Z M30 32 L34 32 L32 28 Z M15 35 Q32 49 49 35 L45 36 L43 40 L39 37.5 L36 42 L32 38 L28 42 L25 37.5 L21 40 L19 36 Z"
            fill="url(#rv-g-carve)"
          />
        )}
      </svg>
    </span>
  );
}

/** An old skull, half sunk in the leaves. */
export function Skull({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 32 30" className={`rv-skull ${className}`} style={style} aria-hidden="true">
      <path d="M4 14 C4 5 10 1 16 1 C22 1 28 5 28 14 C28 18 26 20 24 21 L24 25 L8 25 L8 21 C6 20 4 18 4 14 Z" fill="url(#rv-g-bone)" />
      <path d="M9 25 L23 25 L22 29 L10 29 Z" fill="url(#rv-g-bone)" />
      <ellipse cx="11" cy="14" rx="3.7" ry="3.3" fill="#0a0907" />
      <ellipse cx="21" cy="14" rx="3.7" ry="3.3" fill="#0a0907" />
      <path d="M16 17 L14.4 20.6 L17.6 20.6 Z" fill="#14120e" />
      <path d="M10 24 V28 M13 24 V29 M16 24 V29 M19 24 V29 M22 24 V28" stroke="#3a352c" strokeWidth="0.8" />
    </svg>
  );
}

/** A crow perched and watching, now and then turning its head. */
export function Crow({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <span className={`rv-crow ${className}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 44 34" className="block h-full w-full overflow-visible">
        <path
          d="M8 14 C12 9 20 8 27 11 L38 16 C40 17 42 19 43 22 L34 20 C30 24 24 26 18 25 L17 31 L16 31 L16 25 L13 24 L13 31 L12 31 L12 24 C8 22 6 18 8 14 Z M6 11 C6 6 11 4 13 7 C15 10 13 13 9 14 Z M6 9 L0 10.6 L6 11.6 Z"
          fill="#040508"
          stroke="rgba(130,150,205,0.28)"
          strokeWidth="0.5"
        />
        <circle cx="8.6" cy="9" r="0.8" fill="#d9b25a" />
      </svg>
    </span>
  );
}

/** A cobweb strung across a corner. Origin at its corner (top left); flip with scaleX(-1). */
export function Cobweb({ className = "", style }: { className?: string; style?: CSSProperties }) {
  const angles = [0, 16, 34, 52, 70, 90].map((a) => (a * Math.PI) / 180);
  const spokes = angles.map((a) => `M0 0 L${r2(Math.cos(a) * 40)} ${r2(Math.sin(a) * 40)}`).join(" ");
  const rings = [8, 15, 23, 31, 38]
    .map((r) => {
      let d = "";
      angles.forEach((a, i) => {
        const x = r2(Math.cos(a) * r);
        const y = r2(Math.sin(a) * r);
        if (i === 0) d += `M${x} ${y}`;
        else {
          const m = (a + angles[i - 1]!) / 2;
          d += ` Q${r2(Math.cos(m) * r * 0.82)} ${r2(Math.sin(m) * r * 0.82)} ${x} ${y}`;
        }
      });
      return d;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 40 40" className={`rv-web ${className}`} style={style} aria-hidden="true">
      <path d={`${spokes} ${rings}`} fill="none" stroke="rgba(226,232,246,0.42)" strokeWidth="0.45" />
    </svg>
  );
}

/** A bat, wings beating. */
export function Bat({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <span className={`rv-bat ${className}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 40 20" className="rv-bat-wings block h-full w-full">
        <path
          d="M20 8 C18 4 14 2 10 3 C12 5 12 7 10 8 C7 6 3 6 0 8 C4 9 6 11 7 14 C10 11 14 11 17 13 L20 11 L23 13 C26 11 30 11 33 14 C34 11 36 9 40 8 C37 6 33 6 30 8 C28 7 28 5 30 3 C26 2 22 4 20 8 Z"
          fill="#05060a"
        />
      </svg>
    </span>
  );
}

/**
 * Wrought-iron fence along the front of the yard, spear-topped, with a string
 * of orange and violet lights sagging between the posts.
 */
export function IronFence({ width, className = "", style }: { width: number; className?: string; style?: CSSProperties }) {
  const H = 90;
  const gap = 22;
  const n = Math.ceil(width / gap) + 1;
  const bars = Array.from({ length: n }, (_, i) => {
    const x = i * gap;
    const tall = i % 4 === 0;
    const top = tall ? 6 : 16;
    return `M${x} ${H} V${top + 6} M${x - 3} ${top + 7} L${x} ${top} L${x + 3} ${top + 7} Z`;
  }).join(" ");
  const bulbs: { x: number; y: number; c: string }[] = [];
  let string = "";
  for (let i = 0; i + 4 < n; i += 4) {
    const x0 = i * gap;
    const x1 = (i + 4) * gap;
    const sag = 18;
    string += ` M${x0} 22 Q${(x0 + x1) / 2} ${22 + sag * 2} ${x1} 22`;
    for (let k = 1; k < 8; k++) {
      const t = k / 8;
      const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * ((x0 + x1) / 2) + t * t * x1;
      const y = (1 - t) * (1 - t) * 22 + 2 * (1 - t) * t * (22 + sag * 2) + t * t * 22;
      bulbs.push({ x: r2(x), y: r2(y + 2), c: (i / 4 + k) % 3 === 0 ? "violet" : "orange" });
    }
  }
  return (
    <svg viewBox={`0 0 ${width} ${H}`} preserveAspectRatio="xMinYMax slice" className={`rv-fence ${className}`} style={style} aria-hidden="true">
      <path d={`M0 30 H${width} M0 78 H${width}`} stroke="#05060a" strokeWidth="3" />
      <path d={bars} stroke="#05060a" strokeWidth="2.4" fill="#05060a" />
      <path d={string} fill="none" stroke="#0d0d10" strokeWidth="0.8" />
      {bulbs.map((b, i) => (
        <g key={i}>
          <circle cx={b.x} cy={b.y} r="6" fill={b.c === "orange" ? "url(#rv-g-bulb-o)" : "url(#rv-g-bulb-v)"} />
          <circle cx={b.x} cy={b.y} r="2.1" className="rv-bulb" data-c={b.c} />
        </g>
      ))}
    </svg>
  );
}

/**
 * The lantern-bearer: a hooded figure in a long black cloak who walks to the
 * grave you search for and holds up the light. Faces right; mirror to face left.
 */
export function LanternBearer({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <span className={`rv-bearer-figure relative block ${className}`} style={style} aria-hidden="true">
      <span className="rv-bearer-glow" />
      <svg viewBox="0 0 80 140" className="relative block h-full w-full overflow-visible">
        {/* cloak, falling to a train on the ground */}
        <path
          className="rv-bearer-cloak"
          d="M30 22 C22 30 17 62 13 100 C11 118 6 131 0 139 L62 139 C56 126 51 106 49 82 C48 66 47 50 45 38 C43 28 38 22 30 22 Z"
          fill="#040508"
        />
        {/* fold lines in the cloth */}
        <path d="M28 40 C26 70 22 100 18 136 M38 44 C38 80 38 110 40 138" fill="none" stroke="rgba(120,140,190,0.08)" strokeWidth="1.2" />
        {/* hood, and the dark where a face should be */}
        <path d="M21 28 C18 13 27 2 36 4 C45 6 47 19 43 31 C39 27 33 25 26 31 Z" fill="#05060a" />
        <ellipse cx="38.5" cy="20" rx="4" ry="6.5" fill="#000" />
        {/* the arm holding the lantern out */}
        <path d="M42 44 C50 46 58 50 64 53 L63 58 C56 56 49 55 42 55 Z" fill="#05060a" />
        <circle cx="65" cy="56" r="2.2" fill="#2b231c" />
        {/* moonlight on the hood and shoulder */}
        <path d="M27 7 C33 2 42 4 45 14 M44 38 C46 46 48 60 49 80" fill="none" stroke="rgba(140,160,210,0.3)" strokeWidth="0.9" />
        {/* the lantern, swinging from the hand */}
        <g className="rv-bearer-lantern">
          <path d="M65 56 V62" stroke="#1a1612" strokeWidth="0.9" />
          <path d="M60 62 H70 L68 65 H62 Z" fill="#17130e" />
          <rect x="61" y="65" width="8" height="12" rx="1" fill="url(#rv-g-lantern)" />
          <path d="M61 65 V77 M65 65 V77 M69 65 V77" stroke="#17130e" strokeWidth="0.7" />
          <path d="M60 77 H70 L69 80 H61 Z" fill="#17130e" />
        </g>
      </svg>
    </span>
  );
}
