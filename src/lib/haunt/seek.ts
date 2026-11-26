import type { GraveProject, Language, QuestKind } from "@/lib/index/types";
import type { GraveState } from "./life";
import type { HauntStage } from "./stages";

/*
 * The lantern-bearer's ear: turns what a visitor says ("an angry python one",
 * "something nearly at rest", "docs", "hexcrawl") into the graves that fit,
 * best first, and a note of what was understood so the guide can say it back.
 * Plain keyword reading, no network, no model: predictable and instant.
 */

const LANGUAGES: Record<string, Language> = {
  javascript: "JavaScript",
  js: "JavaScript",
  node: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  python: "Python",
  py: "Python",
  go: "Go",
  golang: "Go",
  rust: "Rust",
  rs: "Rust",
};

const STAGES: Record<string, HauntStage> = {
  banshee: "banshee",
  banshees: "banshee",
  angry: "banshee",
  angriest: "banshee",
  furious: "banshee",
  wailing: "banshee",
  screaming: "banshee",
  poltergeist: "poltergeist",
  rattling: "poltergeist",
  violent: "poltergeist",
  restless: "restless",
  uneasy: "restless",
  whisper: "whisper",
  calm: "whisper",
  quiet: "whisper",
  gentle: "whisper",
  peaceful: "whisper",
};

const KINDS: Record<string, QuestKind> = {
  docs: "docs",
  doc: "docs",
  documentation: "docs",
  readme: "docs",
  test: "tests",
  tests: "tests",
  testing: "tests",
  build: "build",
  ci: "build",
  compile: "build",
  dependency: "dependency",
  dependencies: "dependency",
  deps: "dependency",
  upgrade: "dependency",
  outdated: "dependency",
  release: "release",
  publish: "release",
  issue: "issue",
  issues: "issue",
  bug: "issue",
  bugs: "issue",
  todo: "todo",
  todos: "todo",
};

type Intent = "angriest" | "easiest" | "nearest-rest" | "risen" | "random";

const INTENTS: Record<string, Intent> = {
  most: "angriest",
  worst: "angriest",
  hardest: "angriest",
  haunted: "angriest",
  easy: "easiest",
  easiest: "easiest",
  quick: "easiest",
  simple: "easiest",
  small: "easiest",
  beginner: "easiest",
  first: "easiest",
  almost: "nearest-rest",
  nearly: "nearest-rest",
  close: "nearest-rest",
  rest: "nearest-rest",
  risen: "risen",
  alive: "risen",
  living: "risen",
  resurrected: "risen",
  saved: "risen",
  random: "random",
  surprise: "random",
  anything: "random",
  any: "random",
};

const STOP = new Set(["a", "an", "the", "one", "ones", "some", "something", "grave", "graves", "tomb", "spirit", "soul", "project", "with", "that", "for", "me", "find", "show", "i", "want", "need", "looking", "seek", "of", "in", "is", "and", "to", "please", "take", "lead"]);

export type Seeking = {
  /** Matching graves, the best first. Empty if nothing fits. */
  graves: GraveProject[];
  /** What was understood, for the guide to say back. */
  understood: { language?: Language; stage?: HauntStage; kind?: QuestKind; intent?: Intent; names: string[] };
};

/** `random` is injectable so tests are deterministic. */
export function seek(said: string, projects: GraveProject[], states: Map<string, GraveState>, random: () => number = Math.random): Seeking {
  const words = said.toLowerCase().match(/[a-z0-9.+#-]+/g) ?? [];
  const understood: Seeking["understood"] = { names: [] };
  const free: string[] = [];
  for (const w of words) {
    if (LANGUAGES[w]) understood.language = LANGUAGES[w];
    else if (STAGES[w]) understood.stage = STAGES[w];
    else if (KINDS[w]) understood.kind = KINDS[w];
    else if (INTENTS[w]) understood.intent = INTENTS[w];
    else if (!STOP.has(w) && w.length >= 3) free.push(w);
  }

  // Names, owners or words from the epitaph.
  const named = free.length
    ? projects.filter((p) => free.some((w) => [p.name, p.owner, p.causeOfDeath].some((s) => s.toLowerCase().includes(w))))
    : [];
  if (named.length) understood.names = named.map((p) => p.name);
  const heard = understood.language || understood.stage || understood.kind || understood.intent || named.length;
  if (!heard) return { graves: [], understood };

  let graves = named.length ? named : projects;
  const st = (p: GraveProject) => states.get(p.id)!;
  if (understood.language) graves = graves.filter((p) => p.language === understood.language);
  if (understood.intent === "risen") graves = graves.filter((p) => st(p).resurrected);
  else if (understood.stage) graves = graves.filter((p) => !st(p).resurrected && st(p).stage === understood.stage);
  if (understood.kind) graves = graves.filter((p) => p.quests.some((q) => q.kind === understood.kind && !q.done));
  if (understood.intent === "nearest-rest" || understood.intent === "easiest") graves = graves.filter((p) => !st(p).resurrected);

  const remaining = (p: GraveProject) => st(p).total - st(p).done;
  const order: Record<Intent | "default", (a: GraveProject, b: GraveProject) => number> = {
    angriest: (a, b) => st(b).haunt - st(a).haunt,
    easiest: (a, b) => remaining(a) - remaining(b) || st(a).haunt - st(b).haunt,
    "nearest-rest": (a, b) => st(b).life - st(a).life,
    risen: (a, b) => a.name.localeCompare(b.name),
    random: () => 0,
    // By default, the spirit most in need of help comes first.
    default: (a, b) => Number(st(a).resurrected) - Number(st(b).resurrected) || st(b).haunt - st(a).haunt,
  };
  graves = [...graves].sort(order[understood.intent ?? "default"]);
  if (understood.intent === "random") {
    for (let i = graves.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [graves[i], graves[j]] = [graves[j]!, graves[i]!];
    }
  }
  return { graves, understood };
}
