"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getSoundEngine } from "@/lib/audio/engine";

/** Events that count as a user gesture for the browser's autoplay policy. */
const GESTURES = ["pointerdown", "pointerup", "touchend", "keydown", "click"] as const;

function useEngineState() {
  const engine = getSoundEngine();
  return useSyncExternalStore(
    (fn) => engine.subscribe(fn),
    () => (engine.isStarted ? 1 : 0) + (engine.isMuted ? 2 : 0),
    () => 0,
  );
}

/** Always-visible sound toggle (accessibility requirement). */
export function AudioControls() {
  const state = useEngineState();
  const started = (state & 1) === 1;
  const muted = (state & 2) === 2;
  const silent = muted || !started;

  // Sound is on by default: try to start it straight away. Browsers allow
  // that only if the visitor has already engaged with the site, so if it's
  // blocked, the first click, tap or key press anywhere wakes the sound up.
  useEffect(() => {
    const engine = getSoundEngine();
    engine.unlock();
    const unlock = (e: Event) => {
      if ((e.target as Element | null)?.closest?.("[data-sound-toggle]")) return;
      engine.unlock();
      if (engine.isStarted) GESTURES.forEach((g) => window.removeEventListener(g, unlock, true));
    };
    GESTURES.forEach((g) => window.addEventListener(g, unlock, { capture: true, passive: true }));
    return () => GESTURES.forEach((g) => window.removeEventListener(g, unlock, true));
  }, []);

  const onClick = () => {
    const engine = getSoundEngine();
    if (!engine.isStarted) {
      engine.unlock();
      engine.setMuted(false);
    } else {
      engine.toggleMute();
    }
  };

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`font-mono pointer-events-none select-none rounded-full bg-black/40 px-3 py-1.5 text-[11px] tracking-wide text-[#c9d6ea]/80 backdrop-blur-sm transition-opacity duration-700 ${started || muted ? "opacity-0" : "opacity-100"}`}
      >
        Click anywhere for sound
      </span>
      <button
        type="button"
        data-sound-toggle=""
        onClick={onClick}
        aria-pressed={!silent}
        aria-label={silent ? "Turn sound on" : "Mute sound"}
        className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/40 text-[#c9d6ea] backdrop-blur-sm transition hover:border-[var(--candle)]/60 hover:text-[var(--candle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--candle)]"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9h4l5-4v14l-5-4H4z" />
          {silent ? (
            <path d="M17 9l5 6M22 9l-5 6" />
          ) : (
            <>
              <path d="M16.5 8.5a5 5 0 0 1 0 7" />
              <path d="M19 6a8.5 8.5 0 0 1 0 12" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
