import { hauntStage, type HauntStage } from "./stages";

/**
 * How alive a dead project is: 0 = fully dead, 1 = resurrected.
 * Each fixed quest gives it a share of life back. No quests means nothing
 * to fix, which we treat as still dead (we can't verify a resurrection).
 */
export function lifeOf(total: number, done: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, done / total));
}

/** The haunt score falls as life returns, and hits 0 on resurrection. */
export function effectiveHaunt(baseScore: number, life: number): number {
  const base = Math.min(100, Math.max(0, baseScore));
  return Math.round(base * (1 - Math.min(1, Math.max(0, life))));
}

export type GraveState = {
  life: number;
  haunt: number;
  stage: HauntStage;
  resurrected: boolean;
  done: number;
  total: number;
};

/** Everything the UI needs to know about a grave, given which quests are done. */
export function graveState(baseScore: number, quests: { id: string; done: boolean }[], fixed: ReadonlySet<string> = new Set()): GraveState {
  const total = quests.length;
  const done = quests.filter((q) => q.done || fixed.has(q.id)).length;
  const life = lifeOf(total, done);
  const haunt = effectiveHaunt(baseScore, life);
  return { life, haunt, stage: hauntStage(haunt), resurrected: total > 0 && done === total, done, total };
}
