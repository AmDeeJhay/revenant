"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { FogCanvas, type FogBand } from "@/components/effects/FogCanvas";
import { getSoundEngine } from "@/lib/audio/engine";
import { fixDemoQuest, resetDemoFixes } from "@/lib/demo/progress";
import { graveState } from "@/lib/haunt/life";
import { ANGER, hashString, moodOf, weatheringOf } from "@/lib/haunt/mood";
import { STAGE_LABEL } from "@/lib/haunt/stages";
import type { GraveProject, QuestKind } from "@/lib/index/types";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";
import { Ghost } from "./Ghost";
import { GEOMETRY, Monument } from "./Monument";

const KIND_LABEL: Record<QuestKind, string> = {
  build: "Build",
  dependency: "Dead dependency",
  issue: "Issue",
  todo: "TODO",
  docs: "Docs",
  tests: "Tests",
  release: "Release",
};

/** What the ghost says as life comes back. Encouraging, never discouraging. */
const REACTIONS = [
  "…I felt that.",
  "Oh. That's warm. Do that again.",
  "Something in me is… beating?",
  "The fog is thinner. I can see the hill.",
  "I remember what I was for.",
  "Almost. I can almost see the morning.",
];

const LOW_FOG: FogBand[] = [
  { y: 0.84, spread: 0.05, count: 14, size: [0.14, 0.26], alpha: [0.08, 0.16], speed: [0.004, 0.01] },
  { y: 0.98, spread: 0.03, count: 12, size: [0.16, 0.3], alpha: [0.1, 0.18], speed: [-0.008, -0.003] },
];

/** How tall the ghost stands, as a share of the monument's height. */
const GHOST_HEIGHT = { headstone: 0.7, sepulchre: 0.5, crypt: 0.48 } as const;

/*
 * The visit, in ms:
 *   0      the camera moves in on the chosen tomb (it flies from its place in the yard)
 *   1000   the tomb opens: the slab slides, the stone rolls, or the doors swing
 *   2300   the ghost rises out of it
 *   2900   its unfinished business is laid out beside it
 * Leaving runs it backwards, faster.
 */
type Phase = "arrive" | "open" | "rise" | "present" | "leave" | "seal" | "return";
const AT = { open: 1000, rise: 2300, present: 2900 };
const OUT = { seal: 350, return: 1350, done: 2050 };

export function Seance({ project, fixed, from, onExit }: { project: GraveProject; fixed: ReadonlySet<string>; from: DOMRect | null; onExit: () => void }) {
  const reduced = useReducedMotion();
  const monRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);
  const [phase, setPhase] = useState<Phase>(reduced ? "present" : "arrive");
  const [line, setLine] = useState(project.openingLine);
  const [pulse, setPulse] = useState(0);
  const [rising, setRising] = useState(false);

  const s = graveState(project.hauntScore, project.quests, fixed);
  const mood = moodOf(s);
  const g = GEOMETRY[project.tomb];
  const seed = hashString(project.id);
  const years = new Date().getFullYear() - project.bornYear;
  const isOpen = phase === "open" || phase === "rise" || phase === "present" || phase === "leave";
  const ghostOut = phase === "rise" || phase === "present";
  const leaving = phase === "leave" || phase === "seal" || phase === "return";

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  /**
   * Transform that puts the close-up monument exactly over its grave in the
   * yard. Measured with no animation running, so it's the true resting place.
   */
  const toYard = useCallback((): string | null => {
    const el = monRef.current;
    const yardMon = document.querySelector<HTMLElement>(`#grave-${CSS.escape(project.id)} .rv-mon`);
    const r = yardMon?.getBoundingClientRect() ?? from;
    if (!el || !r || r.width === 0) return null;
    const to = el.getBoundingClientRect();
    return `translate(${r.left - to.left}px, ${r.top - to.top}px) scale(${r.width / to.width})`;
  }, [from, project.id]);

  /** The camera move, both ways (Web Animations, so nothing lingers in React state). */
  const fly = useCallback(
    (direction: "in" | "out") => {
      const el = monRef.current;
      if (!el) return;
      el.getAnimations().forEach((a) => a.cancel());
      const yard = toYard();
      const frames: Keyframe[] = yard
        ? [{ transform: yard }, { transform: "none" }]
        : [{ opacity: 0 }, { opacity: 1 }];
      el.animate(direction === "in" ? frames : [...frames].reverse(), {
        duration: direction === "in" ? 1000 : 700,
        easing: direction === "in" ? "cubic-bezier(0.55, 0, 0.2, 1)" : "cubic-bezier(0.5, 0, 0.6, 1)",
        fill: direction === "in" ? "none" : "forwards",
      });
    },
    [toYard],
  );

  // Arrive: start over the grave in the yard, then move in.
  useLayoutEffect(() => {
    if (reduced) return;
    fly("in");
    const el = monRef.current;
    const engine = getSoundEngine();
    later(AT.open, () => {
      setPhase("open");
      if (project.tomb === "crypt") engine.doorCreak(2, 0);
      else engine.stoneGrind(project.tomb === "sepulchre" ? 2.1 : 1.8, 0, project.tomb === "sepulchre" ? 0.9 : 0.65);
    });
    later(AT.rise, () => {
      setPhase("rise");
      if (!s.resurrected) engine.ghostVoice(0, ANGER[s.stage], 0.9);
    });
    later(AT.present, () => setPhase("present"));
    return () => {
      el?.getAnimations().forEach((a) => a.cancel());
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "present") closeRef.current?.focus({ preventScroll: true });
  }, [phase]);

  const close = useCallback(() => {
    if (leaving) return;
    if (reduced) {
      onExit();
      return;
    }
    // Cancel the rest of the arrival if we're leaving before it finished.
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setPhase("leave");
    later(OUT.seal, () => {
      setPhase("seal");
      getSoundEngine().tombSeal(project.tomb === "crypt" ? "door" : "stone");
    });
    later(OUT.return, () => {
      setPhase("return");
      fly("out");
    });
    later(OUT.done, onExit);
  }, [leaving, reduced, onExit, later, project.tomb, fly]);

  // Modal behaviour: Escape leaves, the page behind can't scroll.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [close]);

  const fix = (questId: string) => {
    fixDemoQuest(questId);
    const after = graveState(project.hauntScore, project.quests, new Set([...fixed, questId]));
    const engine = getSoundEngine();
    setPulse((p) => p + 1);
    if (after.resurrected) {
      setRising(true);
      setLine("I… I'm alive. Thank you.");
      engine.playResurrection();
      later(5200, () => setRising(false));
    } else {
      engine.playLifeReturn(after.life);
      setLine(REACTIONS[Math.min(REACTIONS.length - 1, after.done - 1 + Math.floor(Math.random() * 2))]!);
    }
  };

  const reset = () => {
    resetDemoFixes(project.quests.map((q) => q.id));
    setLine(project.openingLine);
  };

  const ghostHeight = GHOST_HEIGHT[project.tomb] * (project.ghost === "girl" ? 0.68 : 1);

  return (
    <div className="rv-crypt fixed inset-0 z-[60] overflow-y-auto md:overflow-hidden" data-phase={phase} data-mood={mood} data-rising={rising}>
      <button type="button" className="rv-crypt-backdrop fixed inset-0 cursor-default" aria-label="Leave the tomb" tabIndex={-1} onClick={close} />

      {/* ---------- the tomb, close up ---------- */}
      <div className="rv-crypt-stage relative h-[56svh] min-h-[340px] md:fixed md:inset-y-0 md:left-0 md:h-auto md:w-[56%]">
        <div className="rv-crypt-glow absolute inset-0" style={{ "--life": s.life } as CSSProperties} aria-hidden="true" />
        <FogCanvas bands={LOW_FOG} tint="150,168,205" className="rv-crypt-fog absolute inset-0 h-full w-full" />
        <div className="absolute inset-x-0 bottom-[9%] flex justify-center md:bottom-[13%]">
          <div ref={monRef} className="rv-crypt-mon relative" style={{ "--r": g.w / g.h } as CSSProperties}>
            {pulse > 0 && <div key={pulse} className="rv-mend-pulse pointer-events-none absolute" aria-hidden="true" />}
            <Monument
              kind={project.tomb}
              name={project.name}
              born={project.bornYear}
              epitaph={project.causeOfDeath}
              seed={seed}
              weathering={weatheringOf(s)}
              life={s.life}
              mood={mood}
              candles={{ lit: s.done, total: s.total }}
              open={isOpen}
            />
            {/* its ghost, rising out of the opening */}
            <div
              className="rv-crypt-ghost absolute"
              data-out={ghostOut}
              style={{ left: `${(g.mouth[0] / g.w) * 100}%`, top: `${(g.mouth[1] / g.h) * 100}%`, height: `${ghostHeight * 100}%` }}
              aria-hidden="true"
            >
              <div className="rv-riser h-full">
                <Ghost kind={project.ghost} style={{ height: "100%" }} />
              </div>
            </div>
            {rising && <span className="rv-resurrect-flash pointer-events-none absolute" aria-hidden="true" />}
          </div>
        </div>
      </div>

      {/* ---------- its unfinished business ---------- */}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="rv-crypt-title"
        className="rv-ledger relative ml-auto w-full p-6 sm:p-8 md:fixed md:inset-y-0 md:right-0 md:w-[44%] md:max-w-[560px] md:overflow-y-auto md:py-10"
        style={{ "--life": s.life } as CSSProperties}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/40 text-[#c9d6ea] transition hover:text-white focus-visible:outline-2 focus-visible:outline-[#ff8a00]"
          aria-label="Close the tomb and go back to the graveyard"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8a93a8]">
          {project.owner} · {project.language}
        </p>
        <h2 id="rv-crypt-title" className="mt-2 font-carved text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold tracking-[0.05em] text-[#f3f5fa]">
          {project.name}
        </h2>
        <p className="mt-1 font-epitaph text-[17px] italic leading-snug text-[#aeb6c8]">
          {s.resurrected ? (
            <>Brought back to life after {years} {years === 1 ? "year" : "years"} in the ground.</>
          ) : (
            <>
              Here lies {project.name}. Born {project.bornYear}. {project.causeOfDeath}
            </>
          )}
        </p>

        <blockquote className="rv-ghost-line mt-5 border-l-2 py-1 pl-4 font-epitaph text-[21px] italic leading-snug" aria-live="polite">
          “{line}”
        </blockquote>

        <div className="mt-6 grid grid-cols-2 gap-4 font-mono text-[11px]">
          <div>
            <div className="flex justify-between text-[#c9cfdd]">
              <span>Unrest · {s.resurrected ? "at peace" : STAGE_LABEL[s.stage]}</span>
              <span>{s.haunt}/100</span>
            </div>
            <div className="mt-1.5 h-[4px] overflow-hidden rounded-full bg-white/[0.07]">
              <span className="rv-seance-haunt block h-full rounded-full transition-[width] duration-1000" style={{ width: `${s.haunt}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[#c9cfdd]">
              <span>Life</span>
              <span>{Math.round(s.life * 100)}%</span>
            </div>
            <div className="mt-1.5 h-[4px] overflow-hidden rounded-full bg-white/[0.07]">
              <span className="rv-seance-life block h-full rounded-full transition-[width] duration-1000" style={{ width: `${s.life * 100}%` }} />
            </div>
          </div>
        </div>

        <h3 className="mt-7 font-carved text-[13px] font-semibold uppercase tracking-[0.22em] text-[#c3cad8]">Unfinished business</h3>
        <p className="mt-1 text-[12.5px] text-[#8b95a9]">Each thing you fix lights a candle at the tomb and mends a little more of the stone.</p>
        <ul className="mt-3 space-y-2.5">
          {project.quests.map((q) => {
            const verified = q.done;
            const done = verified || fixed.has(q.id);
            return (
              <li key={q.id} className="rv-quest rounded-xl border px-4 py-3" data-done={done}>
                <div className="flex items-start gap-3">
                  <span className="rv-quest-mark mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px]" aria-hidden="true">
                    {done ? "✓" : ""}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-[#eef1f8]">
                      <span className="mr-2 rounded bg-white/[0.06] px-1.5 py-px font-mono text-[9.5px] font-bold uppercase tracking-wider text-[#a6aec0]">{KIND_LABEL[q.kind]}</span>
                      {q.title}
                    </p>
                    <p className="mt-1 font-epitaph text-[15px] italic leading-snug text-[#9fb0c8]">“{q.hint}”</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[10px] text-[#ffc36b]">+{q.xp} XP</p>
                    {done ? (
                      <p className="mt-1 font-mono text-[9.5px] text-[#7fd49a]">{verified ? "Verified" : "Fixed · demo"}</p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fix(q.id)}
                        className="mt-1 rounded-full border border-[#3ddc84]/50 px-2.5 py-1 font-mono text-[10px] text-[#8ff0b4] transition hover:border-[#3ddc84] hover:bg-[#3ddc84]/10 focus-visible:outline-2 focus-visible:outline-[#3ddc84]"
                      >
                        Mark fixed
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 text-[11px] leading-relaxed text-[#7d879c]">
          Demo mode: you mark quests fixed here, and it stays in this browser. With GitHub sign-in, you fork the project and each quest is verified by
          reading your fork. We never take anyone&apos;s word for it, and we never write to a repository.
          {project.quests.some((q) => !q.done && fixed.has(q.id)) && (
            <>
              {" "}
              <button type="button" onClick={reset} className="text-[#ff8a00] underline-offset-2 hover:underline">
                Bury it again
              </button>
              .
            </>
          )}
        </p>
      </section>
    </div>
  );
}
