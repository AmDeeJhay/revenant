import type { CSSProperties } from "react";
import type { GhostStyle } from "@/lib/index/types";

/** Ghost art and where its eyes are (% of the image: centre x, centre y, width, height). */
const GHOSTS: Record<GhostStyle, { src: string; ratio: number; eyes: [number, number, number, number][] }> = {
  fedora: {
    src: "/graveyard/ghost-fedora.png",
    ratio: 111 / 274,
    eyes: [
      [41.4, 12.6, 9, 5.5],
      [51.8, 15.1, 8.1, 7.7],
    ],
  },
  girl: {
    src: "/graveyard/ghost-girl.png",
    ratio: 123 / 159,
    eyes: [
      [68.7, 24.5, 3.3, 5],
      [57.7, 25.8, 3.3, 5],
    ],
  },
};

export function ghostRatio(kind: GhostStyle) {
  return GHOSTS[kind].ratio;
}

/**
 * A translucent ghost: a blurred afterimage trailing behind, a body whose
 * edges waver (the `#rv-ecto` filter from <EctoplasmFilter />), and eyes that
 * kindle red when it is angry. Its mood comes from `data-mood` on any ancestor.
 */
export function Ghost({ kind, className = "", style }: { kind: GhostStyle; className?: string; style?: CSSProperties }) {
  const g = GHOSTS[kind];
  return (
    <span className={`rv-spook relative block ${className}`} style={{ aspectRatio: g.ratio, ...style }} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={g.src} alt="" draggable={false} className="rv-spook-trail absolute inset-0 h-full w-full select-none" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={g.src} alt="" draggable={false} className="rv-spook-body relative block h-full w-full select-none" />
      {g.eyes.map(([x, y, w, h], i) => (
        <span
          key={i}
          className="rv-spook-eye absolute"
          style={{ left: `${x}%`, top: `${y}%`, width: `${w * 1.7}%`, height: `${h * 1.5}%` }}
        />
      ))}
    </span>
  );
}

/**
 * One shared SVG filter that makes ghost edges ripple like smoke.
 * Render once per page. Without motion, the edges are wavy but still.
 */
export function EctoplasmFilter({ animate }: { animate: boolean }) {
  return (
    <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden="true" focusable="false">
      <filter id="rv-ecto" x="-15%" y="-10%" width="130%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018 0.045" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G">
          {animate && <animate attributeName="scale" dur="6s" values="3;8;4;7;3" repeatCount="indefinite" />}
        </feDisplacementMap>
      </filter>
    </svg>
  );
}
