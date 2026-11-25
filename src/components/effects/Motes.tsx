"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

export type EmberSource = {
  /** Position of the source as fractions of the canvas, 0 to 1. */
  x: number;
  y: number;
  /** Embers spawned per second. */
  rate: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  kind: "dust" | "ember";
  phase: number;
};

type Props = {
  /** Number of pale dust motes drifting in the air. */
  dust?: number;
  /** Points where warm embers rise from (the pumpkins). */
  embers?: EmberSource[];
  className?: string;
};

/**
 * Floating dust caught in moonlight plus a few embers rising from the
 * jack-o'-lanterns. Particles fade in and out, so nothing ever "pops".
 */
export function Motes({ dust = 50, embers = [], className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let width = 1;
    let height = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const spawnDust = (): Particle => ({
      x: Math.random(),
      y: Math.random() * 0.9,
      vx: (Math.random() - 0.5) * 0.006,
      vy: (Math.random() - 0.6) * 0.004,
      life: 0,
      maxLife: 8 + Math.random() * 10,
      size: 0.6 + Math.random() * 1.4,
      kind: "dust",
      phase: Math.random() * Math.PI * 2,
    });

    const spawnEmber = (src: EmberSource): Particle => ({
      x: src.x + (Math.random() - 0.5) * 0.04,
      y: src.y,
      vx: (Math.random() - 0.5) * 0.01,
      vy: -(0.02 + Math.random() * 0.03),
      life: 0,
      maxLife: 2 + Math.random() * 2.5,
      size: 0.8 + Math.random() * 1.2,
      kind: "ember",
      phase: Math.random() * Math.PI * 2,
    });

    const particles: Particle[] = Array.from({ length: dust }, () => {
      const p = spawnDust();
      p.life = Math.random() * p.maxLife;
      return p;
    });
    const emberDebt = embers.map(() => 0);

    let raf = 0;
    let last = performance.now();

    const frame = (time: number) => {
      const dt = Math.min(0.05, (time - last) / 1000);
      last = time;
      const t = time / 1000;

      embers.forEach((src, i) => {
        emberDebt[i] = (emberDebt[i] ?? 0) + src.rate * dt;
        while ((emberDebt[i] ?? 0) >= 1) {
          particles.push(spawnEmber(src));
          emberDebt[i] = (emberDebt[i] ?? 0) - 1;
        }
      });

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.life += dt;
        if (p.life >= p.maxLife) {
          if (p.kind === "dust") particles[i] = spawnDust();
          else particles.splice(i, 1);
          continue;
        }
        const wobble = Math.sin(t * 0.8 + p.phase) * (p.kind === "ember" ? 0.012 : 0.004);
        p.x += (p.vx + wobble) * dt;
        p.y += p.vy * dt;

        const k = p.life / p.maxLife;
        const fade = Math.sin(Math.PI * k); // 0 -> 1 -> 0
        const px = p.x * width;
        const py = p.y * height;

        if (p.kind === "dust") {
          ctx.fillStyle = `rgba(190,215,240,${0.35 * fade})`;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const r = p.size * 3;
          const g = ctx.createRadialGradient(px, py, 0, px, py, r);
          g.addColorStop(0, `rgba(255,214,120,${0.9 * fade})`);
          g.addColorStop(0.4, `rgba(255,140,30,${0.45 * fade})`);
          g.addColorStop(1, "rgba(255,120,20,0)");
          ctx.fillStyle = g;
          ctx.fillRect(px - r, py - r, r * 2, r * 2);
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
    // Sources are static configuration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, dust]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
