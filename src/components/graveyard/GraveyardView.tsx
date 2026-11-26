"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { FogCanvas, type FogBand } from "@/components/effects/FogCanvas";
import { makeStrike, strikeLight, type Strike } from "@/components/effects/lightning";
import { Motes } from "@/components/effects/Motes";
import { getSoundEngine } from "@/lib/audio/engine";
import { useDemoFixes } from "@/lib/demo/progress";
import { graveState, type GraveState } from "@/lib/haunt/life";
import { ANGER, hashString, moodOf, seeded, weatheringOf } from "@/lib/haunt/mood";
import { STAGE_LABEL } from "@/lib/haunt/stages";
import type { GraveProject } from "@/lib/index/types";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";
import { Angel, BlackCat, Gravedigger, Reaper, Scarecrow, Witch, Wisp } from "./Characters";
import { EctoplasmFilter } from "./Ghost";
import { depthZ, far, human, pathX, project, type Placed, type Spot, type View } from "./camera";
import { Guide } from "./Guide";
import { Bat, Crow, IronFence } from "./Halloween";
import { GEOMETRY, Monument } from "./Monument";
import { Horizon, OldStone, PerspectiveGround, Turf, type GroundPlot } from "./Scenery";
import { Seance } from "./Seance";
import { StoneDefs } from "./StoneDefs";

const STORM_CLOUDS: FogBand[] = [{ y: 0.32, spread: 0.2, count: 12, size: [0.3, 0.55], alpha: [0.5, 0.85], speed: [0.003, 0.007] }];
const MOONLIT_CLOUDS: FogBand[] = [{ y: 0.35, spread: 0.18, count: 8, size: [0.22, 0.4], alpha: [0.04, 0.09], speed: [0.003, 0.007] }];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/* ------------------------------------------------------------------ */
/*  Laying out the yard (see camera.ts for the projection)            */
/* ------------------------------------------------------------------ */

type Yard = {
  view: View;
  graves: Placed[];
  stones: { key: string; variant: number; lean: number; x: number; y: number; w: number; Z: number }[];
  pools: { key: string; x: number; y: number; w: number; Z: number; color: "violet" | "orange" }[];
  wisps: { key: string; x: number; y: number; Z: number; d: number }[];
  cast: { digger?: Spot; reaper?: Spot; scarecrow?: Spot; angel?: Spot; cat?: Spot & { grave: string } };
  home: Spot;
  ground: { path: [[number, number], [number, number]][]; plots: GroundPlot[]; tufts: { x: number; y: number; s: number }[]; leaves: { x: number; y: number; s: number; a: number; c: string }[] };
  fog: FogBand[];
};

function viewFor(W: number, H: number): View {
  const mode = W >= 1100 ? "wide" : W >= 700 ? "mid" : "narrow";
  const height = Math.max(H, 620);
  return {
    W,
    H: height,
    horizon: height * (mode === "narrow" ? 0.42 : 0.44),
    bottom: height - (mode === "narrow" ? 46 : 58),
    U: W * (mode === "wide" ? 0.19 : mode === "mid" ? 0.24 : 0.36),
    mode,
  };
}

const SLOTS = { wide: [-3.1, -1.2, 1.2, 3.0], mid: [-2.3, -1.05, 1.3], narrow: [-0.98, 0.98] };
/** Where the residents stand, per screen size (world X, Z). */
const CAST = {
  wide: { digger: [-2.2, 1.62], reaper: [2.25, 1.75], scarecrow: [-4.3, 3.7], angel: [2.4, 3.1] },
  mid: { digger: [-1.75, 1.62], reaper: [2.0, 1.9], scarecrow: [-3.3, 3.8], angel: [2.2, 3.4] },
  narrow: { digger: [-1.5, 2.55], reaper: [1.45, 3.7], scarecrow: [-1.9, 5.4], angel: undefined },
} as const;

function layoutYard(projects: GraveProject[], W: number, H: number): Yard {
  const v = viewFor(W, H);
  const slots = SLOTS[v.mode];
  const perRow = slots.length;
  const rnd = seeded(97 + projects.length);
  const nearZ = v.mode === "narrow" ? 1.2 : 1.3;
  const step = v.mode === "narrow" ? 1.36 : 1.5;

  // Graves along both sides of the path, the nearest rows filled first.
  const graves: Placed[] = [];
  projects.forEach((p, i) => {
    const r = Math.floor(i / perRow);
    const inRow = Math.min(perRow, projects.length - r * perRow);
    const start = Math.floor((perRow - inRow) / 2);
    const Z = nearZ * Math.pow(step, r) * (1 + (rnd() - 0.5) * 0.08);
    // Each row is rotated a step, so big monuments never stack up in one column.
    const slot = slots[start + (((i % perRow) + r * 2 + 1) % inRow)]!;
    // Alternate rows step outward and inward, so a row never hides the one behind it.
    const X = pathX(Z) + slot + (rnd() - 0.5) * 0.3 + (r % 2 ? 0.45 : -0.1) * Math.sign(slot);
    const { x, y, s } = project(v, X, Z);
    const width = v.U * 0.8 * GEOMETRY[p.tomb].size * s;
    // Keep every grave fully on screen.
    const cx = Math.min(v.W - width * 0.55 - 8, Math.max(width * 0.55 + 8, x));
    graves.push({ p, seed: hashString(p.id), x: cx, y, width, Z });
  });

  // The residents: each stands near their spot, in the nearest gap where no
  // monument hides them and they hide no monument, off the path, on screen.
  type Box = { l: number; r: number; t: number; b: number };
  const boxes: Box[] = graves.map((g) => {
    const geo = GEOMETRY[g.p.tomb];
    return { l: g.x - g.width / 2, r: g.x + g.width / 2, t: g.y - g.width * (geo.h / geo.w), b: g.y };
  });
  const overlaps = (a: Box) =>
    boxes.some((b) => {
      const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
      const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      return w > 0 && h > 0 && w * h > 0.12 * (a.r - a.l) * (a.b - a.t);
    });
  /** `reach`: how far the figure extends left and right of its feet, in heights. */
  const place = (pos: readonly [number, number] | undefined, tall = 1, reach: [number, number] = [0.35, 0.35]): Spot | undefined => {
    if (!pos) return undefined;
    const [X0, Z0] = pos;
    for (const dz of [0, 0.18, -0.12, 0.4, 0.7]) {
      const Z = Z0 + dz;
      const h = human(v, Z) * tall;
      for (const dx of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9, 1.2, -1.2, 1.6, -1.6, 2, -2]) {
        const X = X0 + dx;
        if (Math.abs(X - pathX(Z)) < 0.6) continue;
        const { x, y } = project(v, X, Z);
        const box = { l: x - reach[0] * h, r: x + reach[1] * h, t: y - h, b: y };
        if (box.l < 0 || box.r > v.W || overlaps(box)) continue;
        boxes.push(box);
        return { x, y, Z, h };
      }
    }
    return undefined; // no room for them in this yard: they stay home tonight
  };
  const cast: Yard["cast"] = {
    digger: place(CAST[v.mode].digger, 1, [0.6, 1.25]),
    reaper: place(CAST[v.mode].reaper, 1.15, [0.45, 0.3]),
    scarecrow: place(CAST[v.mode].scarecrow, 1.35, [0.45, 0.45]),
    angel: place(CAST[v.mode].angel, 1.4, [0.25, 0.25]),
  };
  // The cat sits on top of the nearest plain headstone.
  const perch = [...graves].sort((a, b) => a.Z - b.Z).find((g) => g.p.tomb === "headstone");
  if (perch) {
    const boxH = perch.width * (GEOMETRY.headstone.h / GEOMETRY.headstone.w);
    cast.cat = { x: perch.x + perch.width * 0.08, y: perch.y - boxH * (1 - 38 / GEOMETRY.headstone.h), Z: perch.Z - 0.01, h: human(v, perch.Z) * 0.3, grave: perch.p.id };
  }
  const homeZ = v.mode === "narrow" ? 1.32 : 1.1;
  const home = { ...project(v, pathX(homeZ) + 0.12, homeZ), Z: homeZ, h: human(v, homeZ) };

  // Old nameless stones scattered between, never on the path or on top of anyone.
  const taken = [...graves.map((g) => ({ x: g.x, y: g.y, w: g.width })), ...Object.values(cast).filter(Boolean).map((c) => ({ x: c!.x, y: c!.y, w: c!.h * 0.9 }))];
  const stones: Yard["stones"] = [];
  for (let i = 0, tries = 0; i < (v.mode === "narrow" ? 9 : 16) && tries < 300; tries++) {
    const Z = 1.5 + rnd() * 6;
    const span = v.mode === "narrow" ? 2.4 : 5.6;
    const X = (rnd() * 2 - 1) * span;
    if (Math.abs(X - pathX(Z)) < 0.7) continue;
    const { x, y, s } = project(v, X, Z);
    const w = v.U * 0.3 * s;
    if (taken.some((t) => Math.abs(t.x - x) < (t.w + w) * 0.6 && Math.abs(t.y - y) < 40 * s + 10)) continue;
    taken.push({ x, y, w });
    stones.push({ key: `s${i++}`, variant: Math.floor(rnd() * 4), lean: (rnd() - 0.5) * 14, x, y, w, Z });
  }

  const pools: Yard["pools"] = graves.map((g, i) => ({ key: `p${i}`, x: g.x, y: g.y, w: g.width * 1.9, Z: g.Z, color: rnd() < 0.55 ? "violet" : "orange" }));

  const wisps: Yard["wisps"] = Array.from({ length: v.mode === "narrow" ? 5 : 9 }, (_, i) => {
    const Z = 1.5 + rnd() * 4;
    const { x, y } = project(v, (rnd() * 2 - 1) * (v.mode === "narrow" ? 2 : 4.5), Z);
    return { key: `w${i}`, x, y: y - human(v, Z) * (0.3 + rnd() * 0.6), Z, d: rnd() * 10 };
  });

  // The ground: the path's edges, a plot under every standing thing, grass and leaves.
  const path: Yard["ground"]["path"] = [];
  for (let Z = 0.92; Z < 40; Z *= 1.08) {
    const c = pathX(Z);
    const l = project(v, c - 0.44, Z);
    const r = project(v, c + 0.44, Z);
    path.push([[l.x, l.y], [r.x, r.y]]);
  }
  const plots: GroundPlot[] = [
    ...graves.map((g) => ({ x: g.x, y: g.y, w: g.width, h: g.width * (GEOMETRY[g.p.tomb].h / GEOMETRY[g.p.tomb].w) * 0.85 })),
    ...stones.map((s) => ({ x: s.x, y: s.y, w: s.w * 1.2, h: s.w * 1.2 })),
    ...[cast.digger, cast.reaper, cast.scarecrow, cast.angel].filter(Boolean).map((c) => ({ x: c!.x, y: c!.y, w: c!.h * 0.5, h: c!.h })),
  ];
  const tufts: Yard["ground"]["tufts"] = [];
  for (let i = 0; i < 520; i++) {
    const Z = 1 + Math.pow(rnd(), 1.6) * 9;
    const X = (rnd() * 2 - 1) * 9;
    if (Math.abs(X - pathX(Z)) < 0.5) continue;
    const { x, y, s } = project(v, X, Z);
    if (x < -20 || x > v.W + 20) continue;
    tufts.push({ x, y, s: s * (v.U / 180) });
  }
  const leafColors = ["#5a2c10", "#6e3a12", "#4a2410", "#7a4a1a", "#3e2410"];
  const leaves: Yard["ground"]["leaves"] = Array.from({ length: 140 }, () => {
    const Z = 1 + Math.pow(rnd(), 1.4) * 5;
    const { x, y, s } = project(v, pathX(Z) + (rnd() * 2 - 1) * 0.9, Z);
    return { x, y, s: s * (v.U / 200), a: Math.round(rnd() * 180), c: leafColors[Math.floor(rnd() * leafColors.length)]! };
  });

  // Ground fog: thick at the horizon, lying in drifts across the yard.
  const fy = (Z: number) => project(v, 0, Z).y / v.H;
  const fog: FogBand[] = [
    { y: v.horizon / v.H + 0.01, spread: 0.02, count: 22, size: [0.08, 0.16], alpha: [0.07, 0.15], speed: [-0.005, -0.002] },
    { y: fy(4), spread: 0.02, count: 14, size: [0.07, 0.13], alpha: [0.08, 0.16], speed: [0.003, 0.007] },
    { y: fy(2.2), spread: 0.03, count: 12, size: [0.08, 0.15], alpha: [0.06, 0.12], speed: [-0.006, -0.002] },
    { y: fy(1.3), spread: 0.03, count: 12, size: [0.1, 0.18], alpha: [0.05, 0.1], speed: [0.004, 0.009] },
  ];

  return { view: v, graves, stones, pools, wisps, cast, home, ground: { path, plots, tufts, leaves }, fog };
}

/**
 * The screen size, once known. Null on the server and in the first client
 * render: the scene is laid out for the real screen, so it is only drawn in
 * the browser (drawing it on the server at a guessed size would just send
 * ~100 KB of markup that gets thrown away).
 */
function useYardSize() {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const read = () => setSize({ width: document.documentElement.clientWidth, height: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return size;
}

/** Style that stands something on the ground at a spot. */
function stand(spot: { x: number; y: number; Z: number }, height: number, anchorX = 0.5, anchorY = 1): CSSProperties {
  return {
    left: spot.x,
    top: spot.y,
    height,
    zIndex: depthZ(spot.Z),
    transform: `translate(${-anchorX * 100}%, ${-anchorY * 100}%)`,
    "--far": far(spot.Z).toFixed(3),
  } as CSSProperties;
}

/* ------------------------------------------------------------------ */
/*  The yard                                                           */
/* ------------------------------------------------------------------ */

type Opening = { id: string; from: DOMRect | null };

export function GraveyardView({ projects }: { projects: GraveProject[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lastVoice = useRef(0);
  const reduced = useReducedMotion();
  const fixed = useDemoFixes();
  const size = useYardSize();
  const [opening, setOpening] = useState<Opening | null>(null);
  const [near, setNear] = useState<string | null>(null);
  const [lit, setLit] = useState<string | null>(null);

  const yard = useMemo(() => (size ? layoutYard(projects, size.width, size.height) : null), [projects, size]);
  const states = useMemo(() => new Map(projects.map((p) => [p.id, graveState(p.hauntScore, p.quests, fixed)])), [projects, fixed]);
  const all = [...states.values()];
  const banshees = all.filter((s) => !s.resurrected && s.stage === "banshee").length;
  const risen = all.filter((s) => s.resurrected).length;
  const open = opening ? projects.find((p) => p.id === opening.id) ?? null : null;

  // Candlelight that follows the pointer.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onMove = (e: PointerEvent) => {
      root.style.setProperty("--cx", `${e.clientX}px`);
      root.style.setProperty("--cy", `${e.clientY}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // The storm from the entrance rolls on: distant lightning and thunder, and
  // voices drifting around you from graves you can't see into.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const engine = getSoundEngine();
    let strike: Strike | null = null;
    let nextStrike = performance.now() + rand(5000, 9000);
    let nextVoice = performance.now() + rand(3000, 6000);
    let raf = 0;

    const tick = (time: number) => {
      if (!document.hidden) {
        if (time >= nextStrike) {
          const distance = rand(0.45, 1);
          strike = makeStrike(time, distance);
          engine.thunder(distance, 0.3 + distance * 2.6);
          root.style.setProperty("--fx", `${(strike.x * 100).toFixed(1)}%`);
          nextStrike = time + rand(13000, 28000);
        }
        if (time >= nextVoice) {
          engine.ghostVoice(rand(-1, 1), rand(0, 0.7), rand(0.15, 0.3));
          nextVoice = time + rand(8000, 18000);
        }
      }
      if (strike) {
        const elapsed = (time - strike.start) / 1000;
        const flash = reduced ? 0 : strikeLight(strike, elapsed).flash;
        root.style.setProperty("--flash", flash.toFixed(3));
        if (elapsed > 1.8) {
          strike = null;
          root.style.setProperty("--flash", "0");
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  // Come close to a shut tomb and you hear what's inside.
  const onNear = useCallback(
    (p: GraveProject, el: HTMLElement) => {
      const s = graveState(p.hauntScore, p.quests, fixed);
      if (s.resurrected) return;
      const now = performance.now();
      if (now - lastVoice.current < 2200) return;
      lastVoice.current = now;
      const r = el.getBoundingClientRect();
      getSoundEngine().ghostVoice((((r.left + r.width / 2) / window.innerWidth) * 2 - 1) * 0.8, ANGER[s.stage], 0.5);
    },
    [fixed],
  );

  // The reaper notices you.
  const onReaper = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const now = performance.now();
    if (now - lastVoice.current < 2200) return;
    lastVoice.current = now;
    const r = e.currentTarget.getBoundingClientRect();
    getSoundEngine().ghostVoice(((r.left + r.width / 2) / window.innerWidth) * 2 - 1, 0.95, 0.7);
  }, []);

  const choose = useCallback((p: GraveProject, el: HTMLElement) => {
    getSoundEngine().unlock();
    const mon = el.querySelector<HTMLElement>(".rv-mon");
    setOpening({ id: p.id, from: mon?.getBoundingClientRect() ?? null });
  }, []);

  // Back to the yard: focus returns to the grave you came out of.
  const onExit = useCallback(() => {
    const id = opening?.id;
    setOpening(null);
    if (id) requestAnimationFrame(() => document.getElementById(`grave-${id}`)?.focus({ preventScroll: true }));
  }, [opening]);

  const focus = yard && opening ? yard.graves.find((g) => g.p.id === opening.id) : undefined;
  const label = yard && near && !opening ? yard.graves.find((x) => x.p.id === near) : undefined;

  return (
    <div ref={rootRef} className="rv-yard relative w-full overflow-hidden bg-[#03050b]" style={{ height: yard ? yard.view.H : "100svh" }} data-opening={opening ? "" : undefined}>
      <StoneDefs />
      <EctoplasmFilter animate={!reduced} />

      {/* ---------- the world (the camera leans in when a grave is chosen) ---------- */}
      {yard && <World yard={yard}>{(v, cast) => (
      <div
        className="rv-yard-world absolute inset-0 isolate"
        style={focus ? ({ transformOrigin: `${focus.x}px ${focus.y - 60}px` } as CSSProperties) : undefined}
      >
        {/* sky: moon, clouds, moonbeams, a witch, bats */}
        <div className="rv-yard-sky absolute inset-x-0 top-0" style={{ height: v.horizon + 40 }} aria-hidden="true" />
        <div className="rv-moon-halo absolute" style={{ left: "73%", top: 40 }} aria-hidden="true" />
        <div className="rv-moon absolute left-[73%] top-[70px] w-[clamp(52px,5.4vw,92px)]" aria-hidden="true" />
        <div className="rv-yard-flash absolute inset-x-0 top-0" style={{ height: v.horizon + 40 }} aria-hidden="true" />
        <div className="absolute inset-x-0 top-0" style={{ height: v.horizon + 30 }} aria-hidden="true">
          <FogCanvas bands={STORM_CLOUDS} tint="12,17,30" blend="source-over" className="absolute inset-0 h-full w-full" />
          <FogCanvas bands={MOONLIT_CLOUDS} tint="95,112,150" className="absolute inset-0 h-full w-full" />
        </div>
        <div className="rv-witch absolute left-0 top-0" style={{ width: v.mode === "narrow" ? 64 : 104 }} aria-hidden="true">
          <Witch />
        </div>
        {[0, 1, 2].map((i) => (
          <Bat key={i} className="rv-bat-fly absolute" style={{ top: 90 + i * 30, width: 20 + i * 5, animationDelay: `${i * 7 + 3}s`, animationDuration: `${18 + i * 5}s` }} />
        ))}
        {[0, 1, 2].map((i) => (
          <span key={i} className="rv-beam" style={{ left: `${52 + i * 9}%`, height: v.horizon + 120, animationDelay: `${-i * 4}s` }} aria-hidden="true" />
        ))}

        {/* the far ridge and tree line, half lost in fog */}
        <span className="rv-tree rv-tree-far pointer-events-none absolute" style={{ right: "6%", top: v.horizon - Math.min(300, v.W * 0.2), width: "min(26vw, 340px)", zIndex: 2 }} aria-hidden="true" />
        <span className="rv-tree rv-tree-farther pointer-events-none absolute" style={{ left: "30%", top: v.horizon - Math.min(180, v.W * 0.13), width: "min(16vw, 210px)", zIndex: 2 }} aria-hidden="true" />
        {/* the ridge's near edge (viewBox y 114 of 160) sits exactly on the horizon */}
        <Horizon className="absolute inset-x-0 w-full" style={{ top: v.horizon - 114 * (v.W / 1440), height: 160 * (v.W / 1440), zIndex: 3 }} />
        <div className="rv-fog-wall absolute inset-x-0" style={{ top: v.horizon - 70, height: 140, zIndex: 4 }} aria-hidden="true" />

        {/* the ground, the path, and every plot */}
        <div className="absolute inset-0" style={{ zIndex: 5 }} aria-hidden="true">
          <PerspectiveGround width={v.W} height={v.H} horizon={v.horizon} {...yard.ground} />
        </div>

        {/* coloured light lying on the ground */}
        {yard.pools.map((l) => (
          <span key={l.key} className="rv-pool" data-c={l.color} style={{ left: l.x, top: l.y, width: l.w, zIndex: depthZ(l.Z) - 1 }} aria-hidden="true" />
        ))}

        {/* old nameless stones */}
        {yard.stones.map((s) => (
          <OldStone
            key={s.key}
            variant={s.variant}
            lean={s.lean}
            style={{ left: s.x, top: s.y, width: s.w, aspectRatio: "60 / 80", transform: "translate(-50%, -97%)", zIndex: depthZ(s.Z), "--far": far(s.Z).toFixed(3) } as CSSProperties}
          />
        ))}

        {/* the named graves */}
        {yard.graves.map((g) => (
          <Grave
            key={g.p.id}
            placed={g}
            state={states.get(g.p.id)!}
            lit={lit === g.p.id}
            away={opening?.id === g.p.id}
            onNear={onNear}
            onChoose={choose}
            onLook={setNear}
          />
        ))}

        {/* ---------- the residents ---------- */}
        {cast.digger && (
          <span className="rv-char rv-digger absolute" style={stand(cast.digger, cast.digger.h * (112 / 82), 48 / 150, 110 / 112)} aria-hidden="true">
            <span className="rv-dig-light" />
            <span className="block h-full" style={{ aspectRatio: "150 / 112" }}>
              <Gravedigger />
            </span>
          </span>
        )}
        {cast.reaper && (
          <span className="rv-char rv-reaper absolute" style={stand(cast.reaper, cast.reaper.h * (164 / 160), 0.4, 0.99)} onPointerEnter={onReaper} aria-hidden="true">
            <span className="block h-full" style={{ aspectRatio: "84 / 164" }}>
              <Reaper />
            </span>
          </span>
        )}
        {cast.scarecrow && (
          <span className="rv-char rv-scarecrow absolute" style={stand(cast.scarecrow, cast.scarecrow.h * (160 / 150), 0.5, 1)} aria-hidden="true">
            <span className="rv-scare-glow" />
            <span className="block h-full" style={{ aspectRatio: "120 / 160" }}>
              <Scarecrow />
            </span>
            <Crow className="absolute" style={{ left: "80%", top: "24%", width: "16%", aspectRatio: "44 / 34", transform: "translate(-50%, -100%) scaleX(-1)" }} />
          </span>
        )}
        {cast.angel && (
          <span className="rv-char rv-angel absolute" style={stand(cast.angel, cast.angel.h, 0.5, 1)} aria-hidden="true">
            <span className="block h-full" style={{ aspectRatio: "70 / 140" }}>
              <Angel />
            </span>
          </span>
        )}
        {cast.cat && !opening && (
          <span className="rv-char rv-cat absolute" style={stand(cast.cat, cast.cat.h, 0.5, 0.97)} aria-hidden="true">
            <span className="block h-full" style={{ aspectRatio: "44 / 48" }}>
              <BlackCat />
            </span>
          </span>
        )}
        {yard.wisps.map((w) => (
          <Wisp key={w.key} style={{ left: w.x, top: w.y, zIndex: depthZ(w.Z), animationDelay: `${-w.d}s`, "--far": far(w.Z).toFixed(3) } as CSSProperties} />
        ))}

        {/* the lantern-bearer: ask, and they lead you to the grave */}
        <Guide
          view={v}
          graves={yard.graves}
          home={yard.home}
          projects={projects}
          states={states}
          busy={!!opening}
          onLight={setLit}
          onOpen={(p) => {
            const el = document.getElementById(`grave-${p.id}`);
            if (el) choose(p, el);
          }}
        />

        {/* leaves blowing through */}
        {Array.from({ length: v.mode === "narrow" ? 5 : 9 }, (_, i) => (
          <span
            key={i}
            className="rv-blowleaf"
            style={{ top: v.horizon + ((i * 97) % 100) / 100 * (v.H - v.horizon) * 0.8, animationDelay: `${-i * 2.7}s`, animationDuration: `${11 + (i % 4) * 3}s` } as CSSProperties}
            aria-hidden="true"
          />
        ))}

        {/* the name of the grave you're looking at */}
        {label && (
          <span key={label.p.id} className="rv-grave-label" style={{ left: label.x, top: label.y + 12 }} aria-hidden="true">
            <span className="font-carved text-[14px] font-semibold tracking-[0.08em] text-[#f1f3f8]">{label.p.name}</span>
            <span className="rv-grave-status font-mono text-[10.5px]" data-mood={moodOf(states.get(label.p.id)!)}>
              {states.get(label.p.id)!.resurrected ? "Resurrected" : STAGE_LABEL[states.get(label.p.id)!.stage]} · {states.get(label.p.id)!.done}/
              {states.get(label.p.id)!.total} mended
            </span>
          </span>
        )}

        {/* fog over everything on the ground */}
        <div className="pointer-events-none absolute inset-0" style={{ zIndex: 280 }} aria-hidden="true">
          <FogCanvas key={`${v.W}x${v.H}`} bands={yard.fog} tint="150,165,205" className="absolute inset-0 h-full w-full" />
        </div>
        <Motes dust={30} className="pointer-events-none absolute inset-0 h-full w-full" />

        {/* ---------- the foreground, out of focus: a great tree, old stones, the fence ---------- */}
        {/* (On phones its crown would cross the graves, so the stones and fence frame the scene alone.) */}
        {v.mode !== "narrow" && (
          <>
            <span className="rv-tree rv-tree-rim pointer-events-none absolute" style={{ left: "-7%", top: -v.H * 0.06, height: v.H * 1.08, zIndex: 290, transform: "translate(1.5px, -1.5px)" }} aria-hidden="true" />
            <span className="rv-tree rv-tree-front pointer-events-none absolute" style={{ left: "-7%", top: -v.H * 0.06, height: v.H * 1.08, zIndex: 290 }} aria-hidden="true" />
          </>
        )}
        <OldStone variant={0} lean={-6} silhouette style={{ left: v.mode === "narrow" ? "-8%" : "-2%", bottom: -v.H * 0.06, width: v.U * 0.6, aspectRatio: "60 / 80", zIndex: 291 }} />
        <OldStone variant={1} lean={5} silhouette style={{ right: v.mode === "narrow" ? "-10%" : "-3%", bottom: -v.H * 0.08, width: v.U * 0.7, aspectRatio: "60 / 80", zIndex: 291 }} />
        <IronFence width={Math.max(320, v.W)} className="pointer-events-none absolute inset-x-0 bottom-0 w-full" style={{ height: v.mode === "narrow" ? 70 : 92, zIndex: 292 }} />
        <Turf seed={5} className="rv-turf-front pointer-events-none absolute inset-x-0 bottom-0 w-full" style={{ height: v.mode === "narrow" ? 36 : 54, zIndex: 293 }} />
      </div>
      )}</World>}

      {/* ---------- what you read ---------- */}
      <header className="rv-yard-head absolute inset-x-0 top-0 z-50">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-5 sm:flex-nowrap sm:gap-12 sm:px-10">
          <Link href="/" className="flex shrink-0 items-center font-title text-[26px] leading-none text-[#f4f6fb]" aria-label="Revenant home">
            <span aria-hidden="true">{"{"}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/ghost.svg" alt="" aria-hidden="true" className="rv-ghost mx-[1px] w-[17px]" />
            <span>Revenant</span>
            <span aria-hidden="true">{"}"}</span>
          </Link>
        </div>
        <div className="mx-auto max-w-[1180px] px-5 sm:px-10">
          <h1 className="rv-reveal font-carved text-[clamp(1.5rem,2.8vw,2.4rem)] font-semibold tracking-[0.06em] text-[#eef1f7]" style={{ animationDelay: "0.4s" }}>
            The Public Graveyard
          </h1>
          <p className="rv-reveal mt-1 max-w-[30rem] font-epitaph text-[clamp(0.95rem,1.15vw,1.08rem)] italic leading-snug text-[#aab3c6]" style={{ animationDelay: "0.6s" }}>
            Abandoned projects lie here with their business unfinished. Choose a tomb to open it, mend what was left undone, and its spirit can live again.
          </p>
          <p className="rv-reveal mt-2 font-mono text-[11.5px] text-[#3ddc84]/90" style={{ animationDelay: "0.8s" }} aria-live="polite">
            » {projects.length} graves · {plural(banshees, "banshee")} · {risen} risen
            <span className="text-[#ffc36b]/85"> · lost? ask the one with the lantern (or press /)</span>
          </p>
        </div>
      </header>

      <div className="rv-cursor-light pointer-events-none fixed inset-0 z-[55]" aria-hidden="true" />
      <div className="rv-vignette pointer-events-none fixed inset-0 z-[55]" aria-hidden="true" />
      <div className="rv-grain pointer-events-none fixed inset-0 z-[55]" aria-hidden="true" />
      <div className="rv-fade-in pointer-events-none fixed inset-0 z-[58] bg-[#020308]" aria-hidden="true" />

      {open && <Seance key={open.id} project={open} fixed={fixed} from={opening!.from} onExit={onExit} />}
    </div>
  );
}

/** Hands the laid-out view and cast to the scene. */
function World({ yard, children }: { yard: Yard; children: (v: View, cast: Yard["cast"]) => ReactNode }) {
  return <>{children(yard.view, yard.cast)}</>;
}

/* ------------------------------------------------------------------ */
/*  One grave in the yard                                              */
/* ------------------------------------------------------------------ */

function Grave({
  placed,
  state: s,
  lit,
  away,
  onNear,
  onChoose,
  onLook,
}: {
  placed: Placed;
  state: GraveState;
  lit: boolean;
  away: boolean;
  onNear: (p: GraveProject, el: HTMLElement) => void;
  onChoose: (p: GraveProject, el: HTMLElement) => void;
  onLook: (id: string | null) => void;
}) {
  const { p, seed, x, y, width, Z } = placed;
  const mood = moodOf(s);
  const status = s.resurrected ? "Resurrected" : STAGE_LABEL[s.stage];
  return (
    <button
      id={`grave-${p.id}`}
      type="button"
      className="rv-grave absolute"
      style={{ left: x, top: y, width, zIndex: depthZ(Z), "--far": far(Z).toFixed(3) } as CSSProperties}
      data-lit={lit || undefined}
      data-away={away || undefined}
      data-mood={mood}
      aria-label={`${p.name}, born ${p.bornYear}. ${p.causeOfDeath} ${status}, ${s.done} of ${s.total} quests fixed. Open the tomb.`}
      onPointerEnter={(e) => {
        onLook(p.id);
        onNear(p, e.currentTarget);
      }}
      onPointerLeave={() => onLook(null)}
      onFocus={() => onLook(p.id)}
      onBlur={() => onLook(null)}
      onClick={(e) => onChoose(p, e.currentTarget)}
    >
      <span className="rv-grave-lantern" aria-hidden="true" />
      <Monument
        kind={p.tomb}
        name={p.name}
        born={p.bornYear}
        epitaph={p.causeOfDeath}
        seed={seed}
        weathering={weatheringOf(s)}
        life={s.life}
        mood={mood}
        candles={{ lit: s.done, total: s.total }}
        open={false}
      />
    </button>
  );
}
