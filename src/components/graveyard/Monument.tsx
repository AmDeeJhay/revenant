import type { CSSProperties, ReactNode } from "react";
import { seeded, type Mood } from "@/lib/haunt/mood";
import type { TombStyle } from "@/lib/index/types";
import { Greenery } from "./Greenery";
import { Cobweb, Crow, Pumpkin, Skull } from "./Halloween";

/*
 * A grave monument drawn from layered SVG, textured by the materials in
 * <StoneDefs />. Each kind has a part that opens when its grave is chosen:
 *
 *   headstone  the grave slab in front slides off the pit
 *   sepulchre  the round stone rolls aside along its groove
 *   crypt      the bronze doors swing inward
 *
 * Everything is drawn in the kind's own viewBox units; HTML layers (the moving
 * part, candles, mist, light) are placed in percentages of that same box, so
 * the monument scales to any width.
 *
 * `weathering` (0..1, from the haunt score) drives lichen, grime, cracks and
 * the lean of the stone. As quests are fixed it falls and the tomb is
 * visibly mended; each fixed quest also lights a candle.
 */

type Box = [x: number, y: number, w: number, h: number];
type Pt = [x: number, y: number];

type Geometry = {
  w: number;
  h: number;
  /** Width relative to the other kinds, so a crypt stands bigger than a headstone. */
  size: number;
  /** Where the ghost comes out (viewBox units). */
  mouth: Pt;
  /** Votive candle spots, in the order they are lit. */
  candles: Pt[];
  /** Where mist and light leak out while the tomb is shut. */
  seams: Box[];
  grass: Box;
  /** Halloween dressing: where things sit (bottom centre), and how big a pumpkin is here. */
  decor: { unit: number; pumpkins: Pt[]; skull: Pt; crow: Pt; hand: Pt; webs: Pt[] };
};

export const GEOMETRY: Record<TombStyle, Geometry> = {
  headstone: {
    w: 200,
    h: 250,
    size: 0.74,
    mouth: [80, 224],
    candles: [[58, 185], [142, 185], [72, 185], [128, 185], [46, 185], [154, 185]],
    seams: [[30, 236, 60, 8], [110, 236, 60, 8]],
    grass: [-10, 182, 220, 22],
    decor: { unit: 1, pumpkins: [[24, 248], [178, 246]], skull: [164, 248], crow: [114, 40], hand: [192, 242], webs: [] },
  },
  sepulchre: {
    w: 260,
    h: 220,
    size: 1.12,
    mouth: [130, 178],
    candles: [[60, 210], [46, 212], [32, 213], [20, 214], [8, 215], [228, 214]],
    seams: [[76, 196, 104, 10], [182, 120, 8, 50]],
    grass: [-12, 198, 284, 22],
    decor: { unit: 0.5, pumpkins: [[238, 216], [224, 219]], skull: [84, 215], crow: [142, 34], hand: [254, 212], webs: [] },
  },
  crypt: {
    w: 240,
    h: 280,
    size: 1,
    mouth: [120, 218],
    candles: [[52, 247], [188, 247], [66, 247], [174, 247], [36, 257], [204, 257]],
    seams: [[116, 140, 8, 104], [86, 242, 68, 6]],
    grass: [-12, 262, 264, 20],
    decor: { unit: 0.5, pumpkins: [[24, 269], [216, 269]], skull: [196, 259], crow: [36, 91], hand: [234, 279], webs: [[62, 118], [178, 118]] },
  },
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Box in viewBox units -> CSS placement in % of the monument. */
function place(g: Geometry, [x, y, w, h]: Box): CSSProperties {
  return { left: `${(x / g.w) * 100}%`, top: `${(y / g.h) * 100}%`, width: `${(w / g.w) * 100}%`, height: `${(h / g.h) * 100}%` };
}

function toRoman(n: number) {
  const map: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [v, s] of map) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

/** Word-wrap for carved lines (SVG has no wrapping). */
function wrap(text: string, max: number, lines: number) {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (!line) line = word;
    else if ((line + " " + word).length <= max) line += " " + word;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  if (out.length > lines) {
    out.length = lines;
    out[lines - 1] = out[lines - 1]!.replace(/[\s.,;:]*$/, "") + "…";
  }
  return out;
}

/** Font size so `text` in Roman capitals fits `width`. */
function fit(text: string, width: number, max: number, em = 0.78) {
  return Math.min(max, width / Math.max(1, text.length * em));
}

/**
 * Letters cut into stone. Lit from the upper right, the cut's lower-left wall
 * catches the light, so a pale copy sits just down and left of the dark one.
 */
function Carved({
  x,
  y,
  size,
  children,
  className = "font-carved",
  weight = 600,
  spacing = 0,
  italic = false,
  width,
  depth = 1,
}: {
  x: number;
  y: number;
  size: number;
  children: ReactNode;
  className?: string;
  weight?: number;
  spacing?: number;
  italic?: boolean;
  /** Squeeze to this width if the text would run over. */
  width?: number;
  depth?: number;
}) {
  const common = {
    textAnchor: "middle" as const,
    fontSize: r2(size),
    fontWeight: weight,
    letterSpacing: spacing,
    fontStyle: italic ? "italic" : undefined,
    className,
    ...(width ? { textLength: width, lengthAdjust: "spacingAndGlyphs" as const } : {}),
  };
  const o = Math.max(0.35, size * 0.06) * depth;
  return (
    <g aria-hidden="true">
      <text x={r2(x - o)} y={r2(y + o)} fill="rgba(222,230,250,0.3)" {...common}>
        {children}
      </text>
      <text x={x} y={y} fill="#0d1016" fillOpacity={0.86} {...common}>
        {children}
      </text>
    </g>
  );
}

/** A carved line (incised groove with its lit lower edge). */
function Groove({ d, width = 1 }: { d: string; width?: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke="rgba(222,230,250,0.28)" strokeWidth={width} transform="translate(-0.5 0.5)" />
      <path d={d} stroke="#0d1016" strokeOpacity={0.85} strokeWidth={width} />
    </g>
  );
}

/** Jagged cracks running down from a few start points. */
function cracks(rnd: () => number, starts: Pt[], step: number, steps: number) {
  return starts.map(([x, y]) => {
    let d = `M${r2(x)} ${r2(y)}`;
    let cx = x;
    let cy = y;
    const drift = (rnd() - 0.5) * 0.8;
    for (let i = 0; i < steps; i++) {
      cx += (rnd() - 0.5 + drift) * step * 0.9;
      cy += step * (0.55 + rnd() * 0.6);
      d += ` L${r2(cx)} ${r2(cy)}`;
    }
    return d;
  });
}

/** Surface growth on a shape: lichen and grime, with the noise offset per grave. */
function Weather({ d, seed, amount, lichen = "rv-lichen", grime = true, moss = true }: { d: string; seed: number; amount: number; lichen?: string; grime?: boolean; moss?: boolean }) {
  const ox = (seed % 97) * 3.1;
  const oy = (seed % 61) * 2.3;
  const layer = (filter: string, opacity: number, mask?: string) => (
    <g filter={`url(#${filter})`} transform={`translate(${-ox} ${-oy})`} style={{ opacity: r2(opacity) }} mask={mask} className="rv-weather">
      <path d={d} transform={`translate(${ox} ${oy})`} fill="#fff" />
    </g>
  );
  return (
    <>
      {layer(lichen, 0.1 + 0.5 * amount)}
      {grime && layer("rv-grime", 0.55 * amount, "url(#rv-m-high)")}
      {moss && layer("rv-moss", 0.12 + 0.55 * amount, "url(#rv-m-low)")}
    </>
  );
}

type Props = {
  kind: TombStyle;
  name: string;
  born: number;
  epitaph: string;
  seed: number;
  /** 0 = freshly mended, 1 = long neglected. */
  weathering: number;
  /** 0..1; drives the grass and flowers at its foot. */
  life: number;
  mood: Mood;
  candles: { lit: number; total: number };
  open: boolean;
  className?: string;
  style?: CSSProperties;
};

export function Monument({ kind, name, born, epitaph, seed, weathering, life, mood, candles, open, className = "", style }: Props) {
  const g = GEOMETRY[kind];
  const w = Math.min(1, Math.max(0, weathering));
  const risen = mood === "risen";
  const Body = kind === "headstone" ? Headstone : kind === "sepulchre" ? Sepulchre : Crypt;
  const [mx, my] = g.mouth;

  return (
    <div
      className={`rv-mon relative ${className}`}
      data-kind={kind}
      data-mood={mood}
      data-open={open}
      style={{ aspectRatio: `${g.w} / ${g.h}`, "--seed": (seed % 100) / 100, ...style } as CSSProperties}
    >
      <span className="rv-mon-shadow" aria-hidden="true" />
      {/* light from inside, seen once it opens */}
      <span className="rv-mon-light" style={{ left: `${(mx / g.w) * 100}%`, top: `${(my / g.h) * 100}%` }} aria-hidden="true" />

      <div className="rv-mon-art absolute inset-0">
        <Body g={g} name={name} born={born} epitaph={epitaph} seed={seed} w={w} />
      </div>

      <Greenery life={life} seed={seed} risen={risen} className="absolute" style={place(g, g.grass)} />

      {/* what leaks out of a shut tomb */}
      {g.seams.map((s, i) => (
        <span key={i} className="rv-seam" style={place(g, s)} aria-hidden="true">
          <i className="rv-seam-mist" style={{ animationDelay: `${-((seed + i * 37) % 50) / 10}s` }} />
          <i className="rv-seam-mist" style={{ animationDelay: `${-((seed + i * 53 + 20) % 50) / 10}s` }} />
        </span>
      ))}
      {/* mist pours from an open tomb */}
      <span className="rv-pour" style={{ left: `${(mx / g.w) * 100}%`, top: `${(my / g.h) * 100}%` }} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>

      <Decorations g={g} seed={seed} mood={mood} />

      {g.candles.slice(0, Math.min(candles.total, g.candles.length)).map(([x, y], i) => (
        <span
          key={i}
          className="rv-votive"
          data-lit={i < candles.lit}
          style={{ left: `${(x / g.w) * 100}%`, top: `${(y / g.h) * 100}%`, "--d": `${-(((seed + i * 29) % 40) / 10)}s` } as CSSProperties}
          aria-hidden="true"
        >
          <i className="rv-votive-flame" />
        </span>
      ))}
    </div>
  );
}

/**
 * Halloween at the grave, chosen per grave so no two are dressed alike:
 * jack-o'-lanterns, a skull, a crow on top, cobwebs on crypts, coloured
 * light washing up the stone, and a hand clawing out of the angriest graves.
 */
function Decorations({ g, seed, mood }: { g: Geometry; seed: number; mood: Mood }) {
  const rnd = seeded(seed + 77);
  const d = g.decor;
  const k = d.unit;
  const at = ([x, y]: Pt, size: number): CSSProperties => ({ left: `${(x / g.w) * 100}%`, top: `${(y / g.h) * 100}%`, width: `${((size * k) / g.w) * 100}%` });
  const pumpkin = rnd() < 0.75;
  const second = rnd() < 0.4;
  const skull = mood !== "risen" && rnd() < 0.55;
  const crow = rnd() < (mood === "furious" ? 0.8 : 0.35);
  const light = rnd();
  const hand = mood === "furious" || (mood === "haunting" && rnd() < 0.5);
  return (
    <>
      <span className="rv-uplight" data-c={light < 0.45 ? "violet" : light < 0.8 ? "orange" : "green"} aria-hidden="true" />
      {d.webs.map((p, i) => (
        <Cobweb key={i} className="absolute" style={{ ...at(p, 34), transform: i % 2 ? "scaleX(-1)" : undefined, transformOrigin: "0 0" }} />
      ))}
      {crow && <Crow className="rv-decor absolute" style={{ ...at(d.crow, 30), aspectRatio: "44 / 34", transform: `translate(-50%, -92%) scaleX(${seed % 3 ? 1 : -1})` }} />}
      {hand && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/landing/hand.png" alt="" aria-hidden="true" draggable={false} className="rv-decor rv-claw absolute select-none" style={{ ...at(d.hand, 24) }} />
      )}
      {skull && <Skull className="rv-decor absolute" style={{ ...at(d.skull, 14), aspectRatio: "32 / 30" }} />}
      {pumpkin && <Pumpkin className="rv-decor absolute" style={{ ...at(d.pumpkins[0]!, 32), aspectRatio: "64 / 52", "--d": `${-(seed % 30) / 10}s` } as CSSProperties} />}
      {second && <Pumpkin carved={rnd() < 0.5} className="rv-decor absolute" style={{ ...at(d.pumpkins[1]!, 24), aspectRatio: "64 / 52", "--d": `${-(seed % 23) / 10}s` } as CSSProperties} />}
    </>
  );
}

type BodyProps = { g: Geometry; name: string; born: number; epitaph: string; seed: number; w: number };

/** A layer drawn in the monument's own viewBox, covering a box of it. */
function Layer({ g, box, className = "", children }: { g: Geometry; box?: Box; className?: string; children: ReactNode }) {
  const b = box ?? [0, 0, g.w, g.h];
  return (
    <svg viewBox={b.join(" ")} className={`absolute overflow-visible ${className}`} style={place(g, b)} aria-hidden="true">
      {children}
    </svg>
  );
}

/* ---------------------------------------------------------------- */
/*  Headstone and grave slab                                         */
/* ---------------------------------------------------------------- */

const HEADSTONE_SHAPES = [
  "M48 186 V84 A52 50 0 0 1 152 84 V186 Z", // round top
  "M50 186 V96 Q50 60 100 30 Q150 60 150 96 V186 Z", // gothic point
  "M48 186 V72 H60 Q62 40 100 38 Q138 40 140 72 H152 V186 Z", // shouldered
];
const SLAB = "M36 197 L164 197 L182 240 L18 240 Z";
const SLAB_BOX: Box = [12, 190, 176, 62];

function Headstone({ g, name, born, epitaph, seed, w }: BodyProps) {
  const rnd = seeded(seed + 3);
  const shape = HEADSTONE_SHAPES[seed % HEADSTONE_SHAPES.length]!;
  const lean = ((seed % 2 ? 1 : -1) * (1.2 + rnd() * 2.6) * w).toFixed(2);
  const lines = wrap(epitaph, 22, 3);
  const upper = name.toUpperCase();
  const nameSize = fit(upper, 92, 15);
  const crackPaths = cracks(rnd, [[70 + rnd() * 20, 60 + rnd() * 20], [118 + rnd() * 16, 110 + rnd() * 20]], 9, 6);

  return (
    <>
      {/* the open grave under the slab */}
      <Layer g={g}>
        <path d="M44 200 L156 200 L170 238 L30 238 Z" fill="url(#rv-g-pit)" />
        <path d="M44 200 L156 200 L152 208 L48 208 Z" fill="#1a1712" opacity="0.9" />
      </Layer>

      <Layer g={g}>
        <g className="rv-lean" style={{ transform: `rotate(${lean}deg)` }}>
          {/* thickness, then the face */}
          <path d={shape} transform="translate(7 -4)" fill="url(#rv-g-side)" filter="url(#rv-stone)" />
          <path d={shape} fill="url(#rv-g-stone)" filter="url(#rv-stone)" />
          <Weather d={shape} seed={seed} amount={w} />
          <g className="rv-cracks" style={{ opacity: r2(w) }}>
            {crackPaths.map((d, i) => (
              <Groove key={i} d={d} width={0.9} />
            ))}
          </g>
          {/* inscription */}
          {seed % 2 ? (
            <>
              <Groove d="M100 52 V72 M92 59 H108" width={2.2} />
              <Carved x={100} y={88} size={6.5} spacing={2} weight={600}>
                HERE LIES
              </Carved>
            </>
          ) : (
            <>
              {/* a skull in relief over R.I.P. */}
              <Groove d="M92 64 C92 52 108 52 108 64 C108 68 106 70 105 73 L95 73 C94 70 92 68 92 64 Z M96 73 V76 H104 V73" width={1.1} />
              <ellipse cx="96.6" cy="63.5" rx="2.4" ry="2.2" fill="#0d1016" fillOpacity="0.85" />
              <ellipse cx="103.4" cy="63.5" rx="2.4" ry="2.2" fill="#0d1016" fillOpacity="0.85" />
              <path d="M100 66 L99 69 H101 Z" fill="#0d1016" fillOpacity="0.85" />
              <Carved x={100} y={91} size={10} spacing={3} weight={700}>
                R.I.P.
              </Carved>
            </>
          )}
          <Carved x={100} y={108} size={nameSize} width={upper.length * nameSize * 0.78 > 92 ? 92 : undefined} weight={700}>
            {upper}
          </Carved>
          <Groove d="M76 116 H124" width={0.7} />
          <Carved x={100} y={130} size={7.5} spacing={1.5}>
            {`BORN ${born}`}
          </Carved>
          {lines.map((l, i) => (
            <Carved key={i} x={100} y={146 + i * 10} size={8.4} className="font-epitaph" weight={400} italic depth={0.8}>
              {l}
            </Carved>
          ))}
        </g>
        {/* plinth */}
        <g filter="url(#rv-stone)">
          <path d="M40 186 L160 186 L167 181 L47 181 Z" fill="#7b7f86" />
          <rect x="40" y="186" width="120" height="13" fill="url(#rv-g-stone)" />
          <path d="M160 186 L167 181 L167 194 L160 199 Z" fill="url(#rv-g-side)" />
        </g>
        <Weather d="M40 181 H167 V199 H40 Z" seed={seed + 7} amount={w} grime={false} />
      </Layer>

      {/* the slab: the part that slides */}
      <div className="rv-mover rv-slab absolute" style={place(g, SLAB_BOX)}>
        <div className="rv-rattle h-full w-full">
          <svg viewBox={SLAB_BOX.join(" ")} className="h-full w-full overflow-visible" aria-hidden="true">
            <g filter="url(#rv-stone)">
              <path d={SLAB} fill="url(#rv-g-stone)" />
              <path d="M18 240 L182 240 L182 248 L18 248 Z" fill="#484c55" />
            </g>
            <Weather d={SLAB} seed={seed + 13} amount={w} grime={false} />
            <Groove d="M100 203 V234 M86 213 H114" width={1.6} />
            <g className="rv-cracks" style={{ opacity: r2(w) }}>
              <Groove d={cracks(rnd, [[40 + rnd() * 30, 200]], 8, 4)[0]!} width={0.8} />
            </g>
          </svg>
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- */
/*  Rock-cut sepulchre with a rolling stone                          */
/* ---------------------------------------------------------------- */

const DISC_BOX: Box = [72, 92, 116, 116];

function Sepulchre({ g, name, born, seed, w }: BodyProps) {
  const rnd = seeded(seed + 5);
  const j = () => r2((rnd() - 0.5) * 14);
  const rock = `M4 206 L ${8 + j()} 168 C ${10 + j()} 140 ${22 + j()} ${118 + j()} 40 ${100 + j()} L ${52 + j()} 76 C ${70 + j()} 52 ${98 + j()} ${36 + j()} 126 ${32 + j()} L ${146 + j()} 36 L 158 ${28 + j()} C ${190 + j()} 30 ${214 + j()} ${50 + j()} ${228 + j()} 78 L ${236 + j()} 98 C ${250 + j()} 126 ${256 + j()} 166 256 206 Z`;
  const door = "M92 206 V128 Q92 92 130 92 Q168 92 168 128 V206 Z";
  const upper = name.toUpperCase();
  const size = fit(upper, 104, 11);

  return (
    <>
      <Layer g={g}>
        <path d={rock} fill="url(#rv-g-rock)" filter="url(#rv-rock)" />
        <Weather d={rock} seed={seed} amount={w} grime={false} />
        {/* the cut entrance: a recess, its lit sill, then the dark */}
        <path d="M86 208 V126 Q86 86 130 86 Q174 86 174 126 V208 Z" fill="#232326" filter="url(#rv-rock)" />
        <path d={door} fill="url(#rv-g-pit)" />
        <path d="M92 128 Q92 92 130 92" fill="none" stroke="rgba(200,210,235,0.18)" strokeWidth="1.2" />
        {/* the groove the stone runs in */}
        <path d="M58 204 H250 V211 H58 Z" fill="#16171a" />
        <path d="M58 204 H250" stroke="rgba(200,210,235,0.22)" strokeWidth="0.8" />
        {/* name cut over the door */}
        <Carved x={130} y={76} size={size} spacing={1} weight={700} width={upper.length * size * 0.78 > 104 ? 104 : undefined}>
          {upper}
        </Carved>
        <Carved x={130} y={60} size={6.4} spacing={2.2}>
          {toRoman(born)}
        </Carved>
        <g className="rv-cracks" style={{ opacity: r2(w) }}>
          {cracks(rnd, [[40, 120], [214, 96]], 10, 6).map((d, i) => (
            <Groove key={i} d={d} width={1} />
          ))}
        </g>
      </Layer>

      {/* the stone: rolls along the groove */}
      <div className="rv-mover rv-disc absolute" style={place(g, DISC_BOX)}>
        <div className="rv-rattle h-full w-full">
          <svg viewBox="0 0 116 116" className="h-full w-full overflow-visible" aria-hidden="true">
            <circle cx="58" cy="58" r="57" fill="url(#rv-g-rock)" filter="url(#rv-rock)" />
            <circle cx="58" cy="58" r="57" fill="none" stroke="#0e0f12" strokeOpacity="0.5" strokeWidth="1.5" />
            <Weather d="M1 58 A57 57 0 1 0 115 58 A57 57 0 1 0 1 58 Z" seed={seed + 21} amount={w} grime={false} />
            <Groove d="M58 14 A44 44 0 1 1 57.9 14" width={1.4} />
            <Groove d="M58 30 V86 M36 52 H80" width={2.4} />
          </svg>
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- */
/*  Crypt with bronze doors                                          */
/* ---------------------------------------------------------------- */

const DOORS_BOX: Box = [84, 138, 72, 108];

/** Ashlar joints over the wall: courses with staggered vertical joints. */
function joints() {
  let d = "";
  for (let y = 126, row = 0; y < 246; y += 15, row++) {
    d += ` M40 ${y} H200`;
    for (let x = 40 + (row % 2 ? 14 : 0); x < 200; x += 28) d += ` M${x} ${y} V${Math.min(y + 15, 246)}`;
  }
  return d;
}
const JOINTS = joints();

function Leaf({ side, seed, w }: { side: "left" | "right"; seed: number; w: number }) {
  const ring = side === "left" ? 30 : 6;
  const leaf = "M0 0 H36 V108 H0 Z";
  return (
    <svg viewBox="0 0 36 108" className="h-full w-full overflow-visible" aria-hidden="true">
      <path d={leaf} fill="url(#rv-g-bronze)" filter="url(#rv-bronze)" />
      {[6, 58].map((y) => (
        <g key={y}>
          <rect x="5" y={y} width="26" height="44" fill="#000" opacity="0.32" />
          <rect x="6" y={y + 1} width="25" height="43" fill="url(#rv-g-bronze)" filter="url(#rv-bronze)" />
          <path d={`M5 ${y + 44} H31 V${y}`} fill="none" stroke="rgba(235,215,170,0.35)" strokeWidth="0.7" />
        </g>
      ))}
      <Weather d={leaf} seed={seed + (side === "left" ? 3 : 11)} amount={0.35 + w * 0.65} lichen="rv-verdigris" moss={false} />
      {/* ring pull */}
      <circle cx={ring} cy="55" r="3.6" fill="none" stroke="#1a130b" strokeWidth="1.6" />
      <circle cx={ring} cy="55" r="3.6" fill="none" stroke="rgba(240,220,170,0.4)" strokeWidth="0.6" transform="translate(0.4 -0.4)" />
    </svg>
  );
}

function Crypt({ g, name, born, seed, w }: BodyProps) {
  const rnd = seeded(seed + 9);
  const upper = name.toUpperCase();
  const size = fit(upper, 150, 10.5);
  const walls = "M40 112 H200 V248 H40 Z";

  return (
    <>
      <Layer g={g}>
        {/* pediment, cross and cornice */}
        <g filter="url(#rv-stone)">
          <path d="M116 46 H124 V22 H116 Z M108 30 H132 V36 H108 Z" fill="url(#rv-g-stone)" />
          <path d="M26 92 L120 44 L214 92 Z" fill="url(#rv-g-stone)" />
          <path d="M40 88 L120 50 L200 88 Z" fill="#5f636b" />
          <rect x="24" y="90" width="192" height="6" fill="#7e8188" />
        </g>
        <Groove d="M40 88 L120 50 L200 88" width={0.8} />
        {/* walls */}
        <path d={walls} fill="url(#rv-g-stone)" filter="url(#rv-stone)" />
        <path d={JOINTS} fill="none" stroke="#14171d" strokeOpacity="0.45" strokeWidth="0.7" />
        <path d={JOINTS} fill="none" stroke="rgba(220,228,250,0.14)" strokeWidth="0.5" transform="translate(-0.5 0.6)" />
        <Weather d={walls} seed={seed} amount={w} />
        {/* entablature with the name in the frieze */}
        <g filter="url(#rv-stone)">
          <rect x="30" y="96" width="180" height="20" fill="url(#rv-g-stone)" />
          <rect x="28" y="114" width="184" height="4" fill="#7e8188" />
        </g>
        <Carved x={120} y={110} size={size} spacing={1.2} weight={700} width={upper.length * size * 0.78 > 150 ? 150 : undefined}>
          {upper}
        </Carved>
        {/* pilasters */}
        {[40, 178].map((x) => (
          <g key={x}>
            <g filter="url(#rv-stone)">
              <rect x={x - 2} y="118" width="26" height="8" fill="#7b7f86" />
              <rect x={x} y="126" width="22" height="116" fill="url(#rv-g-stone)" />
              <rect x={x - 2} y="240" width="26" height="8" fill="#6e737b" />
            </g>
            <Groove d={`M${x + 6} 130 V236 M${x + 11} 130 V236 M${x + 16} 130 V236`} width={0.7} />
          </g>
        ))}
        <Weather d="M38 118 H62 V248 H38 Z M176 118 H200 V248 H176 Z" seed={seed + 5} amount={w} grime />
        {/* door frame, plaque and the dark behind the doors */}
        <path d="M78 248 V132 H162 V248 H156 V138 H84 V248 Z" fill="#757981" filter="url(#rv-stone)" />
        <path d="M84 248 V138 H156 V248 Z" fill="url(#rv-g-pit)" />
        <rect x="102" y="120" width="36" height="10" fill="#686d75" filter="url(#rv-stone)" />
        <Carved x={120} y={128} size={6.2} spacing={1.4}>
          {toRoman(born)}
        </Carved>
        <g className="rv-cracks" style={{ opacity: r2(w) }}>
          {cracks(rnd, [[68, 140], [176, 104], [192, 150]], 9, 6).map((d, i) => (
            <Groove key={i} d={d} width={0.9} />
          ))}
        </g>
        {/* steps */}
        <g filter="url(#rv-stone)">
          {[
            [34, 248, 172],
            [24, 258, 192],
            [14, 268, 212],
          ].map(([x, y, width]) => (
            <g key={y}>
              <rect x={x} y={y} width={width} height="10" fill="url(#rv-g-stone)" />
              <rect x={x} y={y} width={width} height="2.2" fill="#85898f" />
            </g>
          ))}
        </g>
        <Weather d="M14 248 H226 V278 H14 Z" seed={seed + 17} amount={w} grime={false} />
      </Layer>

      {/* the doors: swing inward */}
      <div className="rv-mover rv-doors absolute" style={place(g, DOORS_BOX)}>
        <div className="rv-rattle relative h-full w-full">
          <div className="rv-leaf rv-leaf-l absolute inset-y-0 left-0 w-1/2">
            <Leaf side="left" seed={seed} w={w} />
          </div>
          <div className="rv-leaf rv-leaf-r absolute inset-y-0 right-0 w-1/2">
            <Leaf side="right" seed={seed} w={w} />
          </div>
        </div>
      </div>
    </>
  );
}
