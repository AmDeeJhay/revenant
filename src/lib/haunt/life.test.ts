import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { effectiveHaunt, graveState, lifeOf } from "./life";

const quests = (n: number, doneFirst = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: `q${i}`, done: i < doneFirst }));

describe("lifeOf", () => {
  it("stays between 0 and 1", () => {
    fc.assert(
      fc.property(fc.integer({ min: -5, max: 50 }), fc.integer({ min: -5, max: 60 }), (total, done) => {
        const life = lifeOf(total, done);
        expect(life).toBeGreaterThanOrEqual(0);
        expect(life).toBeLessThanOrEqual(1);
      }),
    );
  });

  it("treats a grave with no quests as dead", () => {
    expect(lifeOf(0, 0)).toBe(0);
  });
});

describe("effectiveHaunt", () => {
  it("never rises as more life returns", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), fc.double({ min: 0, max: 1, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true }), (base, a, b) => {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        expect(effectiveHaunt(base, hi)).toBeLessThanOrEqual(effectiveHaunt(base, lo));
      }),
    );
  });

  it("is the base score when dead and 0 when fully alive", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (base) => {
        expect(effectiveHaunt(base, 0)).toBe(base);
        expect(effectiveHaunt(base, 1)).toBe(0);
      }),
    );
  });
});

describe("graveState", () => {
  it("is resurrected exactly when every quest is done", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), fc.integer({ min: 0, max: 12 }), (n, d) => {
        const done = Math.min(n, d);
        const s = graveState(80, quests(n, done));
        expect(s.resurrected).toBe(done === n);
        expect(s.done).toBe(done);
      }),
    );
  });

  it("counts quests fixed locally on top of verified ones", () => {
    const s = graveState(60, quests(4, 1), new Set(["q2", "q3"]));
    expect(s.done).toBe(3);
    expect(s.life).toBe(0.75);
    expect(s.haunt).toBe(15);
    expect(s.stage).toBe("whisper");
  });

  it("does not double count a quest that is both verified and fixed", () => {
    expect(graveState(50, quests(2, 1), new Set(["q0"])).done).toBe(1);
  });
});
