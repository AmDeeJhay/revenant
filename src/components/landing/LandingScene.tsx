"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FogCanvas, type FogBand } from "@/components/effects/FogCanvas";
import { Motes } from "@/components/effects/Motes";
import { getSoundEngine } from "@/lib/audio/engine";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

/*
 * The scene is laid out on a fixed-aspect "stage" (matching the 870x620 design
 * frame) that covers the viewport like `object-fit: cover`. Every layer is
 * positioned in percentages of that stage, so the composition holds at any size.
 *
 * Art lives in /public/landing/*.svg. Replace any file with the designer's
 * export of the same name and the scene picks it up with no code change.
 */

const SKY_CLOUDS: FogBand[] = [
  { y: 0.12, spread: 0.1, count: 10, size: [0.18, 0.32], alpha: [0.05, 0.1], speed: [0.003, 0.006] },
];

const HORIZON_FOG: FogBand[] = [
  { y: 0.5, spread: 0.04, count: 18, size: [0.08, 0.16], alpha: [0.08, 0.16], speed: [-0.006, -0.002] },
];

const GROUND_FOG: FogBand[] = [
  { y: 0.55, spread: 0.03, count: 10, size: [0.06, 0.12], alpha: [0.05, 0.1], speed: [0.004, 0.009] },
  { y: 0.97, spread: 0.05, count: 22, size: [0.12, 0.22], alpha: [0.1, 0.2], speed: [0.005, 0.012] },
];

const DEBRIS = [
  { dx: -46, dy: -60, r: -220 },
  { dx: -24, dy: -84, r: 160 },
  { dx: 8, dy: -96, r: -90 },
  { dx: 30, dy: -70, r: 260 },
  { dx: 56, dy: -50, r: -180 },
  { dx: -64, dy: -30, r: 120 },
  { dx: 70, dy: -24, r: -300 },
];

type Phase = "idle" | "lighting";

/** A parallax layer. Depth 0 is the far sky; 1 is right in front of you. */
function Layer({
  depth,
  className = "",
  style,
  children,
}: {
  depth: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={`absolute will-change-transform ${className}`}
      style={{
        ...style,
        transform: `translate3d(calc(var(--px, 0) * ${(-depth * 26).toFixed(1)}px), calc(var(--py, 0) * ${(-depth * 12).toFixed(1)}px), 0)`,
      }}
    >
      {children}
    </div>
  );
}

function Art({ src, className = "", style }: { src: string; className?: string; style?: CSSProperties }) {
  return (
    // Plain <img>: these are static, already-optimized SVGs.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" aria-hidden="true" draggable={false} className={`block h-auto w-full select-none ${className}`} style={style} />
  );
}

function Pumpkin({ src, flicker }: { src: string; flicker: string }) {
  return (
    <div className="relative">
      {/* candlelight spilling onto the ground */}
      <div
        className="pointer-events-none absolute -inset-[70%] rounded-full mix-blend-screen"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,160,50,0.32), rgba(255,120,20,0.12) 45%, rgba(255,120,20,0) 75%)",
          opacity: `var(${flicker}, 1)`,
        }}
      />
      <Art src={src} className="relative" style={{ filter: `brightness(calc(0.8 + var(${flicker}, 1) * 0.3)) drop-shadow(0 0 10px rgba(255,150,40,0.25))` }} />
    </div>
  );
}

/** Smooth candle flicker: a sum of unrelated sines, never a hard flash. */
function flicker(t: number, seed: number) {
  return (
    0.86 +
    0.07 * Math.sin(t * 6.3 + seed) +
    0.05 * Math.sin(t * 11.7 + seed * 2.1) +
    0.04 * Math.sin(t * 1.9 + seed * 0.7)
  );
}

export function LandingScene() {
  const rootRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  useEffect(() => {
    router.prefetch("/graveyard");
  }, [router]);

  // One animation loop: eased parallax, cursor candlelight and pumpkin flicker.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const target = { x: 0, y: 0, cx: window.innerWidth / 2, cy: window.innerHeight * 0.66 };
    const current = { ...target };

    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
      target.cx = e.clientX;
      target.cy = e.clientY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    const tick = (time: number) => {
      const t = time / 1000;
      const ease = reduced ? 1 : 0.06;
      current.x += (target.x - current.x) * ease;
      current.y += (target.y - current.y) * ease;
      current.cx += (target.cx - current.cx) * 0.12;
      current.cy += (target.cy - current.cy) * 0.12;

      const s = root.style;
      s.setProperty("--px", reduced ? "0" : current.x.toFixed(4));
      s.setProperty("--py", reduced ? "0" : current.y.toFixed(4));
      s.setProperty("--cx", `${current.cx.toFixed(1)}px`);
      s.setProperty("--cy", `${current.cy.toFixed(1)}px`);
      s.setProperty("--flicker-l", reduced ? "0.9" : flicker(t, 0.3).toFixed(3));
      s.setProperty("--flicker-r", reduced ? "0.9" : flicker(t, 4.1).toFixed(3));

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduced]);

  const lightCandle = useCallback(async () => {
    if (phase !== "idle") return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    setPhase("lighting");

    const engine = getSoundEngine();
    await engine.light();
    engine.playIgnite();

    window.setTimeout(() => router.push("/graveyard"), reduced ? 450 : 2300);
  }, [phase, reduced, router]);

  const lighting = phase === "lighting";

  return (
    <main
      ref={rootRef}
      className="rv-landing relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-[#04070d]"
      data-phase={phase}
    >
      {/* ---------- the stage ---------- */}
      <div className="rv-stage absolute left-1/2 top-1/2">
        <div className="rv-world absolute inset-0">
          {/* sky */}
          <Layer depth={0} className="-inset-[3%]">
            <div className="rv-sky absolute inset-0" />
          </Layer>

          <Layer depth={0.05} className="-left-[3%] top-0 h-1/2 w-[106%]">
            <FogCanvas bands={SKY_CLOUDS} tint="95,112,150" className="absolute inset-0 h-full w-full" />
          </Layer>

          {/* distant hill with crosses */}
          <Layer depth={0.15} className="-left-[3%] top-[33%] w-[106%]">
            <Art src="/landing/hills.svg" />
          </Layer>

          <Layer depth={0.2} className="-left-[3%] top-0 h-full w-[106%]">
            <FogCanvas bands={HORIZON_FOG} className="absolute inset-0 h-full w-full" />
          </Layer>

          {/* the hand clawing out of the grave */}
          <Layer depth={0.3} className="left-[46.5%] top-[31%] w-[11%]">
            <div className="rv-hand">
              <Art src="/landing/hand.svg" />
            </div>
          </Layer>

          {/* dead tree */}
          <Layer depth={0.45} className="-left-[1%] -top-[3%] w-[39%]">
            <div className="rv-tree">
              <Art src="/landing/tree.svg" />
            </div>
          </Layer>

          {/* foreground earth */}
          <Layer depth={0.55} className="-left-[3%] top-[47.5%] w-[106%]">
            <Art src="/landing/ground.svg" />
          </Layer>
          <Layer depth={0.55} className="-left-[3%] top-[70%] bottom-[-5%] w-[106%]">
            <div className="absolute inset-0 bg-[#020409]" />
          </Layer>

          {/* earth flung up by the hand */}
          <div className="pointer-events-none absolute left-[52%] top-[48%]" aria-hidden="true">
            {DEBRIS.map((d, i) => (
              <span
                key={i}
                className="rv-debris absolute block h-[0.45vw] min-h-1 w-[0.45vw] min-w-1 bg-[#0d1628]"
                style={{ "--dx": `${d.dx}px`, "--dy": `${d.dy}px`, "--r": `${d.r}deg`, animationDelay: `${1.05 + i * 0.03}s` } as CSSProperties}
              />
            ))}
          </div>

          {/* headstone and jack-o'-lanterns */}
          <Layer depth={0.7} className="right-[0.5%] top-[20%] w-[13%]">
            <Art src="/landing/tombstone.svg" />
          </Layer>
          <Layer depth={0.85} className="left-[1.5%] top-[52%] w-[15%]">
            <Pumpkin src="/landing/pumpkin-left.svg" flicker="--flicker-l" />
          </Layer>
          <Layer depth={0.8} className="right-[6.5%] top-[50.5%] w-[14%]">
            <Pumpkin src="/landing/pumpkin-right.svg" flicker="--flicker-r" />
          </Layer>

          {/* near fog and floating motes */}
          <Layer depth={0.9} className="-left-[3%] top-0 h-full w-[106%]">
            <FogCanvas bands={GROUND_FOG} tint="150,170,205" className="absolute inset-0 h-full w-full" />
          </Layer>
          <Motes
            dust={45}
            embers={[
              { x: 0.09, y: 0.6, rate: 1.4 },
              { x: 0.86, y: 0.58, rate: 1.2 },
            ]}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
        </div>

        {/* ---------- content ---------- */}
        <div className="absolute inset-x-0 top-[56%] flex flex-col items-center px-4 text-center">
          <h1 className="rv-reveal rv-title font-title flex items-center text-[clamp(2.6rem,5.4vw,5rem)] leading-none text-[#f4f6fb]" style={{ animationDelay: "0.3s" }}>
            <span aria-hidden="true">{"{"}</span>
            <span className="rv-ghost relative mx-[0.04em] inline-block w-[0.62em]" aria-hidden="true">
              <Art src="/landing/ghost.svg" />
            </span>
            <span className="rv-glitch" data-text="Revenant">Revenant</span>
            <span aria-hidden="true">{"}"}</span>
          </h1>

          <p className="rv-reveal font-hand mt-[1.1em] text-[clamp(0.95rem,1.35vw,1.15rem)] text-[#e7ecf5]" style={{ animationDelay: "0.7s" }}>
            A haunted graveyard for abandoned open-source code.
          </p>
          <p className="rv-reveal font-mono mt-2 max-w-[min(90vw,34rem)] text-[clamp(0.85rem,1.15vw,1rem)] leading-snug text-[#a3adbd]" style={{ animationDelay: "0.95s" }}>
            Every dead repo has unfinished business. Read their epitaphs, finish their quests, and watch them rise.
          </p>

          <div className="rv-reveal relative mt-[clamp(1.25rem,2.6vw,2rem)]" style={{ animationDelay: "1.25s" }}>
            {/* the candle flame that ignites on click */}
            <span className="rv-flame pointer-events-none absolute bottom-[calc(100%-4px)] left-1/2" aria-hidden="true" data-on={lighting} />
            <button
              ref={buttonRef}
              type="button"
              onClick={lightCandle}
              disabled={lighting}
              className="rv-cta font-sans relative rounded-full bg-[#ff8a00] px-[1.6em] py-[0.8em] text-[clamp(0.8rem,0.95vw,0.95rem)] font-semibold text-white transition-[transform,background-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-[#ff9a1f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd08a] active:translate-y-0 disabled:cursor-default"
            >
              {lighting ? "The candle is lit…" : "Light the Candle and Enter the Graveyard"}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- lighting and lens ---------- */}
      <div className="rv-moonlight pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="rv-cursor-light pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="rv-vignette pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="rv-grain pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="rv-fade-in pointer-events-none absolute inset-0 bg-black" aria-hidden="true" />

      {lighting && (
        <div
          className="rv-bloom pointer-events-none fixed inset-0 z-40"
          style={{ "--ox": `${origin.x}px`, "--oy": `${origin.y}px` } as CSSProperties}
          aria-hidden="true"
        />
      )}
      <p className="sr-only" aria-live="polite">
        {lighting ? "Candle lit. Entering the graveyard." : ""}
      </p>
    </main>
  );
}
