import type { GraveProject } from "@/lib/index/types";

/*
 * The yard is a ground plane seen from standing height. A point on the ground
 * at lateral position X and distance Z (world units; Z = 1 is at your feet)
 * appears at  x = W/2 + X·U/Z,  y = horizon + (bottom − horizon)/Z,  scale 1/Z.
 * Everything (graves, people, stones, the path) is placed in world units, so
 * the scene has real depth instead of rows on shelves.
 */
export type View = { W: number; H: number; horizon: number; bottom: number; U: number; mode: "wide" | "mid" | "narrow" };

/** A grave as placed in the yard: screen position of its base centre, width, distance. */
export type Placed = { p: GraveProject; seed: number; x: number; y: number; width: number; Z: number };

/** Somewhere a figure stands: screen position of their feet, distance, height. */
export type Spot = { x: number; y: number; Z: number; h: number };

/** The path winds a little as it climbs to the horizon. */
export const pathX = (Z: number) => 0.35 * Math.sin(Z * 1.3 + 0.4);

export function project(v: View, X: number, Z: number) {
  const s = 1 / Z;
  return { x: v.W / 2 + X * v.U * s, y: v.horizon + (v.bottom - v.horizon) * s, s };
}

/** World X of a screen x at distance Z. */
export const worldX = (v: View, x: number, Z: number) => ((x - v.W / 2) * Z) / v.U;

/** A person's height on screen at distance Z. */
export const human = (v: View, Z: number) => (v.U * 0.62) / Z;

/** 0 near, 1 far: how much fog lies between you and something. */
export const far = (Z: number) => Math.min(1, Math.max(0, (Z - 1.1) / 4));

/** Stack order: nearer things in front. */
export const depthZ = (Z: number) => Math.round(300 - Z * 40);
