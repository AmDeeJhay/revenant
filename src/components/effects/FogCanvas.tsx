"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

export type FogBand = {
  /** Vertical centre of the band, 0 (top) to 1 (bottom). */
  y: number;
  /** Vertical spread of puffs around the centre, as a fraction of height. */
  spread: number;
  /** Number of puffs. */
  count: number;
  /** Puff radius as a fraction of canvas height. */
  size: [number, number];
  /** Opacity range per puff. */
  alpha: [number, number];
  /** Horizontal drift in canvas-widths per second (negative drifts left). */
  speed: [number, number];
};

type Puff = {
  x: number;
  y: number;
  r: number;
  a: number;
  v: number;
  phase: number;
};

type Props = {
  bands: FogBand[];
  /** RGB used for the fog, e.g. "160,180,215". */
  tint?: string;
  /** "lighter" for glowing mist, "source-over" for dark cloud that hides what's behind it. */
  blend?: "lighter" | "source-over";
  className?: string;
};

const RENDER_SCALE = 0.5; // render at half resolution: softer and cheaper

function rand([min, max]: [number, number]) {
  return min + Math.random() * (max - min);
}

function makeSprite(tint: string) {
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 256;
  const ctx = sprite.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, `rgba(${tint},0.55)`);
  g.addColorStop(0.45, `rgba(${tint},0.2)`);
  g.addColorStop(1, `rgba(${tint},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return sprite;
}

/**
 * Layered, drifting fog drawn with soft radial sprites on a canvas.
 * Puffs breathe in size and opacity so the fog never looks like a looping tile.
 */
export function FogCanvas({ bands, tint = "160,180,215", blend = "lighter", className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sprite = makeSprite(tint);
    const puffs: Puff[] = bands.flatMap((band) =>
      Array.from({ length: band.count }, () => ({
        x: Math.random() * 1.4 - 0.2,
        y: band.y + (Math.random() * 2 - 1) * band.spread,
        r: rand(band.size),
        a: rand(band.alpha),
        v: rand(band.speed),
        phase: Math.random() * Math.PI * 2,
      })),
    );

    let width = 1;
    let height = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width * RENDER_SCALE));
      height = Math.max(1, Math.floor(rect.height * RENDER_SCALE));
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let raf = 0;
    let last = performance.now();

    const draw = (time: number) => {
      const dt = Math.min(0.05, (time - last) / 1000);
      last = time;
      const t = time / 1000;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = blend;

      for (const p of puffs) {
        if (!reduced) {
          p.x += p.v * dt;
          if (p.x > 1.3) p.x = -0.3;
          if (p.x < -0.3) p.x = 1.3;
        }
        const breathe = 1 + 0.08 * Math.sin(t * 0.25 + p.phase);
        const size = p.r * height * breathe;
        ctx.globalAlpha = p.a * (0.75 + 0.25 * Math.sin(t * 0.18 + p.phase * 1.7));
        ctx.drawImage(sprite, p.x * width - size, p.y * height - size * 0.42, size * 2, size * 0.84);
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
    // Bands are static configuration; re-seeding on every render would reset the fog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, tint, blend]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
