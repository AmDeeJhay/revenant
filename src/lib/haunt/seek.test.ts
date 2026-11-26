import { describe, expect, it } from "vitest";
import { DEMO_PROJECTS } from "@/lib/demo/projects";
import { graveState } from "./life";
import { seek } from "./seek";

const states = new Map(DEMO_PROJECTS.map((p) => [p.id, graveState(p.hauntScore, p.quests)]));
const names = (said: string) => seek(said, DEMO_PROJECTS, states, () => 0).graves.map((p) => p.name);

describe("seek", () => {
  it("finds a grave by name", () => {
    expect(names("take me to hexcrawl")[0]).toBe("hexcrawl");
  });

  it("filters by language, in any common spelling", () => {
    const py = names("something in py");
    expect(py.length).toBeGreaterThan(0);
    for (const n of py) expect(DEMO_PROJECTS.find((p) => p.name === n)!.language).toBe("Python");
  });

  it("finds the angry ones, angriest first", () => {
    const found = seek("an angry one", DEMO_PROJECTS, states).graves;
    expect(found.length).toBeGreaterThan(0);
    for (const p of found) expect(states.get(p.id)!.stage).toBe("banshee");
    const haunts = found.map((p) => states.get(p.id)!.haunt);
    expect([...haunts].sort((a, b) => b - a)).toEqual(haunts);
  });

  it("finds risen graves", () => {
    const found = seek("show me one that is alive", DEMO_PROJECTS, states).graves;
    expect(found.length).toBeGreaterThan(0);
    for (const p of found) expect(states.get(p.id)!.resurrected).toBe(true);
  });

  it("only offers graves with that kind of work still undone", () => {
    for (const p of seek("docs", DEMO_PROJECTS, states).graves) {
      expect(p.quests.some((q) => q.kind === "docs" && !q.done)).toBe(true);
    }
  });

  it("puts the nearest-to-rest first, and never a risen one", () => {
    const found = seek("one that is almost at rest", DEMO_PROJECTS, states).graves;
    expect(states.get(found[0]!.id)!.resurrected).toBe(false);
    const lives = found.map((p) => states.get(p.id)!.life);
    expect([...lives].sort((a, b) => b - a)).toEqual(lives);
  });

  it("returns nothing for words it doesn't understand", () => {
    expect(names("zzzz qqqq")).toEqual([]);
    expect(names("")).toEqual([]);
  });
});
