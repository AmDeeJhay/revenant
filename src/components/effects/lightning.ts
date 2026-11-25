/**
 * Procedural lightning. A bolt is a jagged channel made by midpoint
 * displacement, with forked side branches, drawn as a wide blue glow, a
 * softer halo and a hot white core.
 */

type Point = { x: number; y: number };

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Jagged path from a to b. `roughness` is the first offset in px. */
function channel(a: Point, b: Point, roughness: number, depth = 7): Point[] {
  let pts = [a, b];
  let offset = roughness;
  for (let i = 0; i < depth; i++) {
    const next: Point[] = [pts[0]!];
    for (let j = 0; j < pts.length - 1; j++) {
      const p = pts[j]!;
      const q = pts[j + 1]!;
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      // Offset perpendicular to the segment.
      const o = rand(-offset, offset);
      next.push({ x: (p.x + q.x) / 2 + (-dy / len) * o, y: (p.y + q.y) / 2 + (dx / len) * o }, q);
    }
    pts = next;
    offset *= 0.52;
  }
  return pts;
}

function stroke(ctx: CanvasRenderingContext2D, pts: Point[], width: number, color: string, blur: number, glow: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.shadowBlur = blur;
  ctx.shadowColor = glow;
  ctx.stroke();
}

function drawChannel(ctx: CanvasRenderingContext2D, pts: Point[], scale: number, strength: number) {
  stroke(ctx, pts, 9 * scale, `rgba(120,150,255,${0.07 * strength})`, 40 * scale, "rgba(130,160,255,0.9)");
  stroke(ctx, pts, 3.2 * scale, `rgba(185,205,255,${0.45 * strength})`, 14 * scale, "rgba(170,195,255,0.9)");
  stroke(ctx, pts, 1.3 * scale, `rgba(255,255,255,${0.95 * strength})`, 4 * scale, "rgba(255,255,255,1)");
}

/**
 * Clears the canvas and draws a fresh bolt from the cloud base down to
 * `groundY`, starting near `x` (canvas pixels).
 */
export function drawBolt(canvas: HTMLCanvasElement, x: number, groundY: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const scale = Math.max(0.6, height / 500);
  const top: Point = { x, y: -10 };
  const bottom: Point = { x: x + rand(-0.12, 0.12) * height, y: groundY };
  const main = channel(top, bottom, height * 0.12);
  drawChannel(ctx, main, scale, 1);

  // Forks: thinner, dimmer, and they peter out in mid-air.
  const forks = Math.round(rand(3, 7));
  for (let i = 0; i < forks; i++) {
    const at = main[Math.floor(rand(0.08, 0.7) * main.length)]!;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const len = rand(0.12, 0.35) * height;
    const angle = Math.PI / 2 + dir * rand(0.35, 0.9);
    const end = { x: at.x + Math.cos(angle) * len, y: at.y + Math.sin(angle) * len };
    const fork = channel(at, end, len * 0.18, 5);
    drawChannel(ctx, fork, scale * 0.55, 0.55);

    if (Math.random() < 0.5) {
      const from = fork[Math.floor(rand(0.3, 0.7) * fork.length)]!;
      const l2 = len * rand(0.3, 0.55);
      const a2 = angle + dir * rand(0.2, 0.6);
      const twig = channel(from, { x: from.x + Math.cos(a2) * l2, y: from.y + Math.sin(a2) * l2 }, l2 * 0.2, 4);
      drawChannel(ctx, twig, scale * 0.35, 0.35);
    }
  }
  ctx.shadowBlur = 0;
}

export type Strike = {
  /** performance.now() when the first stroke lands. */
  start: number;
  /** Horizontal position of the strike, 0..1 across the stage. */
  x: number;
  /** 0 = overhead, 1 = far away. */
  distance: number;
  /** Whether a visible bolt is drawn (distant strikes are only sheet light). */
  bolt: boolean;
  /** Return strokes: [offset in seconds, amplitude]. */
  pulses: [number, number][];
};

export function makeStrike(now: number, distance: number): Strike {
  // Real lightning flickers: usually 2-5 return strokes 40-150 ms apart.
  const count = Math.round(rand(2, 5));
  const pulses: [number, number][] = [];
  let t = 0;
  for (let i = 0; i < count; i++) {
    pulses.push([t, i === 0 ? 1 : rand(0.45, 1)]);
    t += rand(0.045, 0.15);
  }
  return {
    start: now,
    x: rand(0.3, 0.92),
    distance,
    bolt: distance < 0.7,
    pulses,
  };
}

/** Brightness of the flash and of the bolt at `seconds` after the strike. */
export function strikeLight(s: Strike, seconds: number) {
  if (seconds < 0) return { flash: 0, bolt: 0 };
  let flash = 0;
  let bolt = 0;
  for (const [t, a] of s.pulses) {
    if (seconds < t) break;
    const dt = seconds - t;
    flash = Math.max(flash, a * Math.exp(-dt / 0.075));
    bolt = Math.max(bolt, a * Math.exp(-dt / 0.11));
  }
  // The sky stays faintly lit for a moment after the last stroke.
  flash += 0.18 * Math.exp(-seconds / 0.7);
  const power = 1 - s.distance * 0.6;
  return { flash: Math.min(1, flash * power), bolt: s.bolt ? Math.min(1, bolt) : 0 };
}
