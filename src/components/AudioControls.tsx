"use client";

import { useSyncExternalStore } from "react";
import { getSoundEngine } from "@/lib/audio/engine";

function useEngineState() {
  const engine = getSoundEngine();
  return useSyncExternalStore(
    (fn) => engine.subscribe(fn),
    () => (engine.isLit ? 1 : 0) + (engine.isMuted ? 2 : 0),
    () => 0,
  );
}

/** Always-visible mute button (accessibility requirement). */
export function AudioControls() {
  const state = useEngineState();
  const lit = (state & 1) === 1;
  const muted = (state & 2) === 2;
  const silent = muted || !lit;

  return (
    <button
      type="button"
      onClick={() => getSoundEngine().toggleMute()}
      aria-pressed={muted}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      title={lit ? undefined : "Sound starts when you light the candle"}
      className="fixed right-4 top-4 z-50 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/40 text-[#c9d6ea] backdrop-blur-sm transition hover:border-[var(--candle)]/60 hover:text-[var(--candle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--candle)]"
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
  );
}
