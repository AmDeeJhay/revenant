"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FogCanvas, type FogBand } from "@/components/effects/FogCanvas";
import { Motes } from "@/components/effects/Motes";
import { drawBolt, makeStrike, strikeLight, type Strike } from "@/components/effects/lightning";
import { getSoundEngine, quakeEnvelope } from "@/lib/audio/engine";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

/*
 * The scene is laid out on a fixed-aspect "stage" of 1440 x 1026 units that
 * covers the viewport like `object-fit: cover`. The ground artwork
 * (/landing/ground.png, 1440 x 864) sits flush with the bottom of the stage,
 * so a point (x, y) in that image is at (x / 1440, (162 + y) / 1026) of the stage.
 * Every other layer is positioned in percentages of the stage from that rule.
 *
 * Art: ground.png (hill, crosses, headstone, jack-o'-lanterns), tree.png,
 * hand.png and cracks.png (the fissures in the ground, used as a light mask).
 */

const DARK_CLOUDS: FogBand[] = [
  { y: 0.2, spread: 0.14, count: 16, size: [0.28, 0.5], alpha: [0.55, 0.9], speed: [0.004, 0.009] },
];

const MOONLIT_CLOUDS: FogBand[] = [
  { y: 0.24, spread: 0.12, count: 9, size: [0.2, 0.36], alpha: [0.05, 0.1], speed: [0.004, 0.008] },
];

const HORIZON_FOG: FogBand[] = [
  { y: 0.44, spread: 0.03, count: 18, size: [0.07, 0.14], alpha: [0.08, 0.16], speed: [-0.006, -0.002] },
];

const GROUND_FOG: FogBand[] = [
  { y: 0.5, spread: 0.03, count: 10, size: [0.06, 0.12], alpha: [0.05, 0.1], speed: [0.004, 0.009] },
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

/** Jack-o'-lantern faces inside ground.png, as clip insets and glow centres (% of the image). */
const PUMPKINS = [
  { clip: "inset(40.9% 85.8% 43.6% 0%)", glow: { left: "7.2%", top: "48.6%" }, flicker: "--flicker-l" },
  { clip: "inset(35% 6.9% 48.4% 79.6%)", glow: { left: "86.4%", top: "43.3%" }, flicker: "--flicker-r" },
];

/*
 * Opening, like a horror film cold open (ms after the page loads):
 *   400   the ground starts to shake, building as the hand claws its way up
 *   ~2100 the hand breaks the surface and throws earth
 *   3400  a close lightning strike and thunderclap as it reaches for the sky
 *   6400  the quake settles; the storm rolls on, with aftershocks now and then
 */
const INTRO_QUAKE = { at: 400, duration: 6000 };
const INTRO_STRIKE_AT = 3400;

type Phase = "idle" | "lighting";
type Spark = { dx: number; dy: number; d: number; s: number };
type Quake = { start: number; duration: number; amp: number };

const rand = (min: number, max: number) => min + Math.random() * (max - min);

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
    // Plain <img>: static artwork, positioned by the stage, no layout shift to manage.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" aria-hidden="true" draggable={false} className={`block h-auto w-full select-none ${className}`} style={style} />
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

/** Lightning distance: mostly mid-range, some close, some far off. */
function pickDistance(forceNear: boolean) {
  if (forceNear) return rand(0.05, 0.3);
  const r = Math.random();
  return r < 0.3 ? rand(0.05, 0.35) : r < 0.7 ? rand(0.35, 0.7) : rand(0.7, 1);
}

export function LandingScene() {
  const rootRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const boltRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const lightingRef = useRef(false);
  const stormRef = useRef({ next: 0, forceNear: false });
  const quakesRef = useRef<Quake[]>([]);
  const mountRef = useRef(0);
  const router = useRouter();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [sparks, setSparks] = useState<Spark[]>([]);

  useEffect(() => {
    router.prefetch("/graveyard");
  }, [router]);

  // The opening quake. Its sound is scheduled a moment later so the sound
  // engine has had its chance to start (sound is on by default).
  useEffect(() => {
    const start = performance.now();
    mountRef.current = start;
    // Start the hand's CSS rise on the same clock as the quake and thunder.
    if (rootRef.current) rootRef.current.dataset.intro = "";
    quakesRef.current = [{ start: start + INTRO_QUAKE.at, duration: INTRO_QUAKE.duration, amp: 1 }];
    const id = window.setTimeout(() => {
      getSoundEngine().quake(1, INTRO_QUAKE.duration / 1000);
    }, INTRO_QUAKE.at);
    return () => window.clearTimeout(id);
  }, []);

  // If the browser held the sound back until the first click, pick the scene
  // up where it is: finish the opening quake, or answer with an aftershock
  // and a close strike.
  useEffect(() => {
    const engine = getSoundEngine();
    let wasStarted = engine.isStarted;
    return engine.subscribe(() => {
      if (engine.isStarted && !wasStarted && !lightingRef.current) {
        const now = performance.now();
        const introEnd = mountRef.current + INTRO_QUAKE.at + INTRO_QUAKE.duration;
        if (now < introEnd - 800) {
          engine.quake(0.9, (introEnd - now) / 1000);
        } else {
          const duration = 2600;
          quakesRef.current.push({ start: now, duration, amp: 0.55 });
          engine.quake(0.75, duration / 1000);
          stormRef.current.next = now + 900;
          stormRef.current.forceNear = true;
        }
      }
      wasStarted = engine.isStarted;
    });
  }, []);

  // One animation loop: parallax, cursor light, pumpkin and candle flicker, lightning.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const s = root.style;
    const engine = getSoundEngine();

    const target = { x: 0, y: 0, cx: window.innerWidth / 2, cy: window.innerHeight * 0.66 };
    const current = { ...target };
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
      target.cx = e.clientX;
      target.cy = e.clientY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const world = worldRef.current;
    const storm = stormRef.current;
    const quakes = quakesRef.current;
    storm.next = mountRef.current + INTRO_STRIKE_AT;
    storm.forceNear = true;
    let nextAftershock = performance.now() + rand(16000, 26000);
    let strike: Strike | null = null;

    const fire = (time: number) => {
      const distance = pickDistance(storm.forceNear);
      storm.forceNear = false;
      storm.next = time + rand(7000, 16000);
      strike = makeStrike(time, distance);
      // Sound travels ~3 s per km; compressed so you never wait too long.
      engine.thunder(distance, 0.12 + distance * 3.2);
      if (reduced) return; // thunder only, no flashing
      const canvas = boltRef.current;
      if (canvas && strike.bolt) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        drawBolt(canvas, strike.x * canvas.width, canvas.height);
      }
      s.setProperty("--fx", `${(strike.x * 100).toFixed(1)}%`);
      root.dataset.flash = "";
    };

    let raf = 0;
    const tick = (time: number) => {
      const t = time / 1000;
      const ease = reduced ? 1 : 0.06;
      current.x += (target.x - current.x) * ease;
      current.y += (target.y - current.y) * ease;
      current.cx += (target.cx - current.cx) * 0.12;
      current.cy += (target.cy - current.cy) * 0.12;

      s.setProperty("--px", reduced ? "0" : current.x.toFixed(4));
      s.setProperty("--py", reduced ? "0" : current.y.toFixed(4));
      s.setProperty("--cx", `${current.cx.toFixed(1)}px`);
      s.setProperty("--cy", `${current.cy.toFixed(1)}px`);
      s.setProperty("--flicker-l", reduced ? "0.9" : flicker(t, 0.3).toFixed(3));
      s.setProperty("--flicker-r", reduced ? "0.9" : flicker(t, 4.1).toFixed(3));

      // Candle flame: tall-and-thin when it stretches, short-and-wide when it gutters.
      if (lightingRef.current && !reduced) {
        const n = Math.sin(t * 13.1) + 0.7 * Math.sin(t * 7.7 + 1.3) + 0.35 * Math.sin(t * 23.3 + 0.4);
        s.setProperty("--fl-sy", (1 + 0.06 * n).toFixed(3));
        s.setProperty("--fl-sx", (1 - 0.035 * n).toFixed(3));
        s.setProperty("--fl-sk", `${(2.4 * Math.sin(t * 2.3) + 1.6 * Math.sin(t * 5.9 + 0.8)).toFixed(2)}deg`);
        s.setProperty("--fl-i", (0.86 + 0.07 * n).toFixed(3));
      }

      // Earthquake: the whole world shudders (aftershocks keep coming).
      if (!lightingRef.current && !document.hidden && time >= nextAftershock) {
        const duration = rand(1800, 3200);
        const amp = rand(0.25, 0.5);
        quakes.push({ start: time, duration, amp });
        engine.quake(amp * 1.3, duration / 1000);
        nextAftershock = time + rand(18000, 34000);
      }
      let shake = 0;
      for (let i = quakes.length - 1; i >= 0; i--) {
        const q = quakes[i]!;
        const k = (time - q.start) / q.duration;
        if (k >= 1) quakes.splice(i, 1);
        else if (k > 0) shake += q.amp * quakeEnvelope(k);
      }
      if (world) {
        if (shake > 0.001 && !reduced) {
          // Several unrelated frequencies plus jitter: violent but organic.
          const jx = Math.sin(t * 43) + 0.6 * Math.sin(t * 71 + 1.7) + 0.4 * (Math.random() * 2 - 1);
          const jy = Math.sin(t * 37 + 0.5) + 0.6 * Math.sin(t * 89 + 2.9) + 0.4 * (Math.random() * 2 - 1);
          const jr = Math.sin(t * 23 + 1.1);
          world.style.transform = `translate3d(${(jx * 5.5 * shake).toFixed(2)}px, ${(jy * 4.5 * shake).toFixed(2)}px, 0) rotate(${(jr * 0.3 * shake).toFixed(3)}deg)`;
        } else if (world.style.transform) {
          world.style.transform = "";
        }
      }

      // Storm.
      if (!lightingRef.current && !document.hidden && time >= storm.next) fire(time);
      if (strike && !reduced) {
        const elapsed = (time - strike.start) / 1000;
        const { flash, bolt } = strikeLight(strike, elapsed);
        s.setProperty("--flash", flash.toFixed(3));
        s.setProperty("--bolt", bolt.toFixed(3));
        if (elapsed > 1.8) {
          strike = null;
          s.setProperty("--flash", "0");
          s.setProperty("--bolt", "0");
          delete root.dataset.flash;
        }
      } else if (strike) {
        strike = null;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduced]);

  const lightCandle = useCallback(() => {
    if (phase !== "idle") return;
    lightingRef.current = true;
    // Light pours out from the candle itself.
    const rect = (buttonRef.current?.querySelector(".rv-candle-stick") ?? buttonRef.current)?.getBoundingClientRect();
    if (rect) setOrigin({ x: rect.left + rect.width / 2, y: rect.top - 10 });
    setSparks(
      Array.from({ length: 18 }, () => ({
        dx: rand(-70, 70),
        dy: rand(-80, -15),
        d: rand(0.45, 0.9),
        s: rand(1.5, 3),
      })),
    );
    setPhase("lighting");

    const engine = getSoundEngine();
    engine.unlock();
    engine.playLightCandle();

    window.setTimeout(() => router.push("/graveyard"), reduced ? 500 : 3000);
  }, [phase, reduced, router]);

  const lighting = phase === "lighting";

  return (
    <main
      ref={rootRef}
      className="rv-landing relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-[#01050c]"
      data-phase={phase}
    >
      {/* ---------- the stage ---------- */}
      <div className="rv-stage absolute left-1/2 top-1/2">
        <div ref={worldRef} className="rv-world absolute inset-0">
          {/* sky, moon and the glow of lightning inside the clouds */}
          <Layer depth={0} className="-inset-[3%]">
            <div className="rv-sky absolute inset-0" />
            <div className="rv-moon absolute left-[66%] top-[9%] w-[3.6%]" />
            <div className="rv-flash-sky absolute inset-0" />
          </Layer>

          {/* the bolt itself, behind the hill so the hill hides where it lands */}
          <Layer depth={0.04} className="inset-x-0 top-0 h-[44%]">
            <canvas ref={boltRef} aria-hidden="true" className="rv-bolt absolute inset-0 h-full w-full" />
          </Layer>

          {/* storm clouds drift across the moon */}
          <Layer depth={0.06} className="rv-clouds inset-x-0 top-0 h-1/2">
            <FogCanvas bands={DARK_CLOUDS} tint="13,19,33" blend="source-over" className="absolute inset-0 h-full w-full" />
            <FogCanvas bands={MOONLIT_CLOUDS} tint="95,112,150" className="absolute inset-0 h-full w-full" />
          </Layer>

          <Layer depth={0.2} className="inset-0">
            <FogCanvas bands={HORIZON_FOG} className="absolute inset-0 h-full w-full" />
          </Layer>

          {/* the hand clawing out of the grave (behind the ground, so it rises out of it) */}
          <Layer depth={0.5} className="left-[42.9%] top-[26.4%] w-[10%]">
            <div className="rv-hand">
              <Art src="/landing/hand.png" className="rv-lit" />
            </div>
          </Layer>

          {/* dead tree */}
          <Layer depth={0.5} className="-left-[1%] -top-[5.3%] w-[36%]">
            <div className="rv-tree">
              <Art src="/landing/tree.png" className="rv-lit" />
            </div>
          </Layer>

          {/* the ground: hill, crosses, headstone and jack-o'-lanterns */}
          <Layer depth={0.55} className="inset-x-0 bottom-0">
            <div className="relative">
              <Art src="/landing/ground.png" className="rv-ground" />
              {/* earth below the art, in case parallax lifts it */}
              <div className="absolute inset-x-0 top-full h-[20vh] bg-[#01050c]" />

              {/* fissures catch the lightning, then glow with candlelight */}
              <div className="rv-cracks rv-cracks-flash absolute left-[24.9%] top-[34.3%] w-[54.9%]" aria-hidden="true" />
              <div className="rv-cracks-glow absolute left-[24.9%] top-[34.3%] w-[54.9%]" aria-hidden="true">
                <div className="rv-cracks rv-cracks-ember w-full" />
              </div>

              {PUMPKINS.map((p) => (
                <div key={p.flicker} aria-hidden="true">
                  {/* the face, brightened and dimmed by its candle */}
                  <Art
                    src="/landing/ground.png"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      clipPath: p.clip,
                      // Includes the lightning term so the face never looks like a pasted box.
                      filter: `brightness(calc((0.75 + var(${p.flicker}, 1) * 0.45) * (1 + var(--flash, 0) * 2.6))) saturate(1.15)`,
                    }}
                  />
                  {/* candlelight spilling onto the ground */}
                  <div
                    className="pointer-events-none absolute aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen"
                    style={{
                      ...p.glow,
                      background:
                        "radial-gradient(closest-side, rgba(255,160,50,0.3), rgba(255,120,20,0.1) 45%, rgba(255,120,20,0) 75%)",
                      opacity: `var(${p.flicker}, 1)`,
                    }}
                  />
                </div>
              ))}
            </div>
          </Layer>

          {/* earth flung up by the hand */}
          <div className="pointer-events-none absolute left-[47.9%] top-[42.9%]" aria-hidden="true">
            {DEBRIS.map((d, i) => (
              <span
                key={i}
                className="rv-debris absolute block h-[0.45vw] min-h-1 w-[0.45vw] min-w-1 bg-[#0d1628]"
                style={{ "--dx": `${d.dx}px`, "--dy": `${d.dy}px`, "--r": `${d.r}deg`, animationDelay: `${2.05 + i * 0.04}s` } as CSSProperties}
              />
            ))}
          </div>

          {/* near fog and floating motes */}
          <Layer depth={0.9} className="-left-[3%] top-0 h-full w-[106%]">
            <FogCanvas bands={GROUND_FOG} tint="150,170,205" className="absolute inset-0 h-full w-full" />
          </Layer>
          <Motes
            dust={45}
            embers={[
              { x: 0.07, y: 0.5, rate: 1.4 },
              { x: 0.864, y: 0.46, rate: 1.2 },
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

          <div className="rv-reveal rv-candle relative mt-[clamp(1.6rem,3vw,2.4rem)]" style={{ animationDelay: "1.25s" }} data-lit={lighting}>
            <button
              ref={buttonRef}
              type="button"
              onClick={lightCandle}
              onPointerEnter={() => getSoundEngine().playHover()}
              disabled={lighting}
              className="rv-cta font-sans relative inline-flex items-center gap-[0.7em] rounded-full bg-[#ff8a00] py-[0.8em] pl-[1.15em] pr-[1.6em] text-[clamp(0.8rem,0.95vw,0.95rem)] font-semibold text-white transition-[transform,background-color,box-shadow,color] duration-500 hover:-translate-y-0.5 hover:bg-[#ff9a1f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd08a] active:translate-y-0 disabled:cursor-default"
            >
              {/* The candle lives inside the button: wax, wick, smoke, then a real flame. */}
              <span className="rv-candle-stick relative inline-block" aria-hidden="true">
                <span className="rv-wick absolute bottom-full left-1/2">
                  <span className="rv-smoke" />
                  <span className="rv-smoke" />
                  <span className="rv-smoke" />
                  <span className="rv-ember" />
                </span>
                <span className="rv-flame absolute bottom-[calc(100%+6px)] left-1/2">
                  <span className="rv-flame-glow" />
                  <span className="rv-flame-body">
                    <i className="rv-flame-outer" />
                    <i className="rv-flame-inner" />
                    <i className="rv-flame-blue" />
                  </span>
                </span>
                {lighting && !reduced && (
                  <span className="absolute bottom-[calc(100%+6px)] left-1/2">
                    {sparks.map((sp, i) => (
                      <span
                        key={i}
                        className="rv-spark"
                        style={{ "--dx": `${sp.dx}px`, "--dy": `${sp.dy}px`, "--d": `${sp.d}s`, "--s": `${sp.s}px` } as CSSProperties}
                      />
                    ))}
                  </span>
                )}
              </span>
              <span className="relative">{lighting ? "The candle is lit…" : "Light the Candle and Enter the Graveyard"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------- lighting and lens ---------- */}
      <div className="rv-moonlight pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="rv-cursor-light pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="rv-flash-front pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="rv-vignette pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="rv-grain pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="rv-fade-in pointer-events-none absolute inset-0 bg-black" aria-hidden="true" />

      {lighting && (
        <>
          <div
            className="rv-candle-light pointer-events-none fixed inset-0 z-30"
            style={{ "--ox": `${origin.x}px`, "--oy": `${origin.y}px` } as CSSProperties}
            aria-hidden="true"
          />
          <div
            className="rv-bloom pointer-events-none fixed inset-0 z-40"
            style={{ "--ox": `${origin.x}px`, "--oy": `${origin.y}px` } as CSSProperties}
            aria-hidden="true"
          />
        </>
      )}
      <p className="sr-only" aria-live="polite">
        {lighting ? "Candle lit. Entering the graveyard." : ""}
      </p>
    </main>
  );
}
