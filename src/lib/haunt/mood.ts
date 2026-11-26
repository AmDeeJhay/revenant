import type { GraveState } from "./life";
import type { HauntStage } from "./stages";

/** How a ghost behaves at each stage. */
export const MOOD: Record<HauntStage, "calm" | "restless" | "haunting" | "furious"> = {
  whisper: "calm",
  restless: "restless",
  poltergeist: "haunting",
  banshee: "furious",
};

/** How angry its voice is (0..1), for the sound engine. */
export const ANGER: Record<HauntStage, number> = { whisper: 0.1, restless: 0.3, poltergeist: 0.6, banshee: 0.9 };

/** Small seeded PRNG, so a grave weathers the same way on every render. */
export function seeded(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable number from a string (for seeding per-grave randomness). */
export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The mood a grave shows: its haunt stage, or "risen" once resurrected. */
export type Mood = "calm" | "restless" | "haunting" | "furious" | "risen";

export function moodOf(s: GraveState): Mood {
  return s.resurrected ? "risen" : MOOD[s.stage];
}

/** How worn a tomb looks (0..1). Follows the haunt score, so fixing quests mends it. */
export function weatheringOf(s: GraveState) {
  return Math.min(1, s.haunt / 85);
}
