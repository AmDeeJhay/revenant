"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { getSoundEngine } from "@/lib/audio/engine";
import type { GraveState } from "@/lib/haunt/life";
import { seek, type Seeking } from "@/lib/haunt/seek";
import type { GraveProject } from "@/lib/index/types";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";
import { depthZ, human, pathX, project, worldX, type Placed, type Spot, type View } from "./camera";
import { LanternBearer } from "./Halloween";
import { GEOMETRY } from "./Monument";

/*
 * The lantern-bearer: the yard's guide. Ask what you seek, in your own words
 * ("an angry python one", "something nearly at rest", "hexcrawl"); they walk
 * the path to the grave, leaving a trail of light, tell you who lies there,
 * and, if you wish, open the tomb for you with the lantern's light.
 */

type Phase = "idle" | "asking" | "lost" | "walking" | "arrived" | "casting";
type Stand = Spot & { X: number; flip: boolean };

const ASKS = ["The angriest spirit", "Something in Python", "One nearly at rest", "An easy one to mend", "Surprise me"];

const TEMPER: Record<string, string> = {
  banshee: "It screams through the night.",
  poltergeist: "It rattles its stone when no one is near.",
  restless: "It turns and turns in its sleep.",
  whisper: "It only whispers now.",
};

type Props = {
  view: View;
  graves: Placed[];
  home: Spot;
  projects: GraveProject[];
  states: Map<string, GraveState>;
  /** A tomb is open: the guide steps back and keeps quiet. */
  busy: boolean;
  onLight: (id: string | null) => void;
  onOpen: (p: GraveProject) => void;
};

export function Guide({ view: v, graves, home, projects, states, busy, onLight, onOpen }: Props) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const homeStand = useCallback((): Stand => ({ ...home, X: worldX(v, home.x, home.Z), flip: false }), [home, v]);
  const [stand, setStand] = useState<Stand>(homeStand);
  const [phase, setPhase] = useState<Phase>("idle");
  const [hint, setHint] = useState(false);
  const [said, setSaid] = useState("");
  const [found, setFound] = useState<{ seeking: Seeking; index: number } | null>(null);
  const [trail, setTrail] = useState<{ key: string; x: number; y: number; d: number }[]>([]);
  const [spell, setSpell] = useState<{ key: number; sx: number; sy: number; tx: number; ty: number } | null>(null);

  // A new layout (resize): back to the gate.
  useLayoutEffect(() => {
    setStand(homeStand());
    setPhase("idle");
    setFound(null);
    onLight(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeStand]);

  // After a moment, the guide offers to help.
  useEffect(() => {
    const id = window.setTimeout(() => setHint(true), 3200);
    return () => window.clearTimeout(id);
  }, []);

  const ask = useCallback(() => {
    setHint(false);
    setPhase("asking");
    getSoundEngine().unlock();
  }, []);

  // "/" asks the guide; Escape sends them quiet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (busy) return;
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        ask();
      } else if (e.key === "Escape" && phase !== "idle" && phase !== "walking" && phase !== "casting") {
        setPhase("idle");
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ask, busy, phase]);

  useEffect(() => {
    if (phase === "asking" || phase === "lost") inputRef.current?.focus({ preventScroll: true });
    if (phase === "arrived") openRef.current?.focus({ preventScroll: true });
  }, [phase]);

  const current = found ? graves.find((g) => g.p.id === found.seeking.graves[found.index]?.id) : undefined;

  /** Where to stand beside a grave: on the path side of it, facing it. */
  const besideGrave = useCallback(
    (g: Placed): Stand => {
      const h = human(v, g.Z);
      const pathAtGrave = project(v, pathX(g.Z), g.Z).x;
      const right = g.x > pathAtGrave;
      const x = right ? g.x - g.width * 0.55 - h * 0.12 : g.x + g.width * 0.55 + h * 0.12;
      const Z = g.Z - 0.03;
      return { x, y: g.y + 3, Z, h: human(v, Z), X: worldX(v, x, Z), flip: !right };
    },
    [v],
  );

  /** Walk the path from here to there, leaving lantern light along the way. */
  const walk = useCallback(
    (to: Stand, then: () => void) => {
      const el = ref.current;
      const from = stand;
      if (!el || reduced) {
        setStand(to);
        then();
        return;
      }
      // Onto the path, along it, then off it to the grave.
      const pts: { x: number; y: number; h: number }[] = [{ x: from.x, y: from.y, h: from.h }];
      const lane = (Z: number) => pathX(Z) + (to.X > pathX(to.Z) ? 0.14 : -0.14);
      const up = to.Z >= from.Z;
      const steps = Math.max(2, Math.ceil(Math.abs(Math.log(to.Z / from.Z)) / 0.07));
      for (let i = 0; i <= steps; i++) {
        const Z = from.Z * Math.pow(to.Z / from.Z, i / steps);
        const p = project(v, lane(Z), Z);
        pts.push({ x: p.x, y: p.y, h: human(v, Z) });
      }
      pts.push({ x: to.x, y: to.y, h: to.h });
      let total = 0;
      const dist = pts.map((p, i) => (i ? (total += Math.hypot(p.x - pts[i - 1]!.x, p.y - pts[i - 1]!.y)) : 0));
      const duration = Math.min(5200, Math.max(1400, total * 4.2));
      const frames = pts.map((p, i) => ({ left: `${p.x}px`, top: `${p.y}px`, height: `${p.h}px`, offset: total ? dist[i]! / total : i / (pts.length - 1) }));
      setTrail(pts.slice(1, -1).filter((_, i) => i % 2 === 0).map((p, i, all) => ({ key: `${Date.now()}-${i}`, x: p.x, y: p.y, d: ((i + 1) / (all.length + 1)) * duration })));
      setPhase("walking");
      el.style.zIndex = String(Math.max(depthZ(from.Z), depthZ(to.Z)) + 2);
      // Facing the way they walk: up the path toward the grave's side, or back down.
      if (up ? to.flip : !to.flip) el.dataset.flip = "true";
      else delete el.dataset.flip;
      const anim = el.animate(frames, { duration, easing: "cubic-bezier(0.4, 0, 0.6, 1)", fill: "forwards" });
      anim.onfinish = () => {
        setStand(to);
        requestAnimationFrame(() => {
          anim.cancel();
          el.style.zIndex = "";
          if (to.flip) el.dataset.flip = "true";
          else delete el.dataset.flip;
          then();
        });
      };
    },
    [stand, v, reduced],
  );

  const lead = useCallback(
    (seeking: Seeking, index: number) => {
      const p = seeking.graves[index];
      const g = p && graves.find((x) => x.p.id === p.id);
      if (!g) return;
      setFound({ seeking, index });
      onLight(null);
      walk(besideGrave(g), () => {
        onLight(g.p.id);
        setPhase("arrived");
        getSoundEngine().ghostVoice((g.x / v.W) * 2 - 1, 0.3, 0.35);
      });
    },
    [graves, walk, besideGrave, onLight, v.W],
  );

  const answer = (words: string) => {
    const seeking = seek(words, projects, states);
    setSaid(words);
    if (!seeking.graves.length) {
      setPhase("lost");
      return;
    }
    lead(seeking, 0);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (said.trim()) answer(said.trim());
  };

  /** The lantern's light flies into the tomb and opens it. */
  const cast = () => {
    if (!current) return;
    const geo = GEOMETRY[current.p.tomb];
    const dir = ref.current?.dataset.flip === "true" || stand.flip ? -1 : 1;
    setPhase("casting");
    getSoundEngine().playLifeReturn(0.7);
    setSpell({
      key: Date.now(),
      sx: stand.x + dir * stand.h * 0.2,
      sy: stand.y - stand.h * 0.43,
      tx: current.x,
      ty: current.y - current.width * (geo.h / geo.w) * 0.5,
    });
    window.setTimeout(
      () => {
        setSpell(null);
        setPhase("idle");
        onOpen(current.p);
      },
      reduced ? 0 : 1500,
    );
  };

  const next = () => found && lead(found.seeking, (found.index + 1) % found.seeking.graves.length);

  const s = current ? states.get(current.p.id) : undefined;
  const talking = !busy && (phase === "asking" || phase === "lost" || phase === "arrived" || phase === "casting" || (phase === "idle" && hint));
  const bubbleW = Math.min(330, v.W - 24);
  const bubbleX = Math.min(v.W - bubbleW / 2 - 12, Math.max(bubbleW / 2 + 12, stand.x));

  return (
    <>
      {/* the light left behind on the path */}
      {trail.map((t) => (
        <span key={t.key} className="rv-trail" style={{ left: t.x, top: t.y, animationDelay: `${t.d}ms` }} aria-hidden="true" />
      ))}

      <button
        ref={ref}
        type="button"
        className="rv-bearer absolute"
        data-walking={phase === "walking" || undefined}
        data-flip={stand.flip || undefined}
        data-cast={phase === "casting" || undefined}
        style={{ left: stand.x, top: stand.y, height: stand.h, zIndex: depthZ(stand.Z) }}
        onClick={ask}
        aria-label="The lantern-bearer. Ask them to lead you to a grave."
      >
        <LanternBearer style={{ height: "100%", aspectRatio: "80 / 140" }} />
      </button>

      {/* the lantern's light flying into the tomb */}
      {spell && (
        <span className="rv-spell" style={{ "--sx": `${spell.sx}px`, "--sy": `${spell.sy}px`, "--tx": `${spell.tx}px`, "--ty": `${spell.ty}px` } as CSSProperties} aria-hidden="true">
          {Array.from({ length: 16 }, (_, i) => (
            <i key={`${spell.key}-${i}`} style={{ animationDelay: `${i * 40}ms`, "--wob": `${((i * 37) % 21) - 10}px` } as CSSProperties} />
          ))}
          <b className="rv-spell-burst" />
        </span>
      )}

      {talking && (
        <section
          className="rv-speech absolute"
          data-phase={phase}
          style={{ left: bubbleX, top: stand.y - stand.h - 10, width: phase === "idle" ? "auto" : bubbleW, "--tail": `${stand.x - bubbleX}px` } as CSSProperties}
          aria-label="The lantern-bearer"
        >
          {phase === "idle" && (
            <button type="button" className="rv-speech-hint" onClick={ask}>
              Lost, wanderer? Ask me.
            </button>
          )}

          {(phase === "asking" || phase === "lost") && (
            <>
              <p className="rv-speech-line" aria-live="polite">
                {phase === "lost" ? (
                  <>
                    I know of no grave like “{said}”. Tell me a name, its tongue, or its temper.
                  </>
                ) : (
                  <>What do you seek, wanderer?</>
                )}
              </p>
              <form onSubmit={onSubmit} className="mt-2.5 flex gap-2">
                <label className="sr-only" htmlFor="rv-seek">
                  What you seek
                </label>
                <input
                  id="rv-seek"
                  ref={inputRef}
                  value={said}
                  onChange={(e) => setSaid(e.target.value)}
                  placeholder="a name, a language, a mood…"
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-full border border-[#ffc36b]/30 bg-black/40 px-3 py-1.5 font-epitaph text-[15px] italic text-[#f3e6cc] placeholder:text-[#9c8f78] focus:border-[#ffc36b]/70 focus:outline-none"
                />
                <button type="submit" className="rv-speech-go">
                  Lead me
                </button>
              </form>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {ASKS.map((a) => (
                  <button key={a} type="button" className="rv-speech-chip" onClick={() => answer(a)}>
                    {a}
                  </button>
                ))}
              </div>
              <button type="button" className="rv-speech-close" onClick={() => setPhase("idle")} aria-label="Never mind">
                ×
              </button>
            </>
          )}

          {phase === "arrived" && current && s && found && (
            <>
              <p className="rv-speech-line" aria-live="polite">
                Here lies <b>{current.p.name}</b>. {current.p.causeOfDeath}{" "}
                {s.resurrected ? "It lives again; its tomb is mended." : `${TEMPER[s.stage]} ${s.total - s.done} ${s.total - s.done === 1 ? "thing" : "things"} left undone.`}
              </p>
              {found.seeking.graves.length > 1 && (
                <p className="mt-1 font-mono text-[10px] text-[#b7a98d]">
                  {found.index + 1} of {found.seeking.graves.length} that fit what you asked
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button ref={openRef} type="button" className="rv-speech-go" onClick={cast}>
                  ✦ Open the tomb
                </button>
                {found.seeking.graves.length > 1 && (
                  <button type="button" className="rv-speech-chip" onClick={next}>
                    Another
                  </button>
                )}
                <button type="button" className="rv-speech-chip" onClick={ask}>
                  Seek something else
                </button>
              </div>
            </>
          )}

          {phase === "casting" && <p className="rv-speech-line">Stand back. Let the light in…</p>}
        </section>
      )}
    </>
  );
}
