export type HauntStage = "whisper" | "restless" | "poltergeist" | "banshee";

export const STAGE_LABEL: Record<HauntStage, string> = {
  whisper: "Whisper",
  restless: "Restless",
  poltergeist: "Poltergeist",
  banshee: "Banshee",
};

/** Maps a 0-100 haunt score to its stage. Out-of-range scores are clamped. */
export function hauntStage(score: number): HauntStage {
  const s = Math.min(100, Math.max(0, score));
  if (s >= 75) return "banshee";
  if (s >= 50) return "poltergeist";
  if (s >= 25) return "restless";
  return "whisper";
}
