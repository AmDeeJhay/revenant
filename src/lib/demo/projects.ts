import type { GraveProject, Quest, QuestKind } from "@/lib/index/types";

/**
 * Demo-mode graves. All names are fictional so demo mode never points at,
 * or jokes about, a real project or person. Some graves already have quests
 * done so every stage of coming back to life is visible.
 */

type QuestSeed = [kind: QuestKind, title: string, hint: string, xp: number, done?: boolean];
type Seed = Omit<GraveProject, "id" | "quests"> & { quests: QuestSeed[] };

const RAW: Seed[] = [
  {
    owner: "lantern-labs", name: "pixel-pantry", language: "JavaScript", bornYear: 2022, hauntScore: 58, tomb: "headstone", ghost: "girl",
    causeOfDeath: "Died of a missing .env file.",
    openingLine: "Nobody ever told me what my API key was. I waited.",
    quests: [
      ["docs", "Add a .env.example", "Just tell them what I need. That's all I ever wanted.", 20],
      ["build", "Fix the failing install step", "npm install screams in red. Make it stop.", 40],
      ["issue", "Close #12: images never load", "My pantry is full of broken pictures.", 30],
    ],
  },
  {
    owner: "quietbyte", name: "tidy-tasks", language: "Python", bornYear: 2021, hauntScore: 31, tomb: "crypt", ghost: "fedora",
    causeOfDeath: "Died of scope creep.",
    openingLine: "I was meant to be a to-do list. Then someone wanted calendars.",
    quests: [
      ["dependency", "Move off Python 3.7", "3.7 is dead. I'd rather not keep it company.", 40, true],
      ["todo", "Resolve the TODO in tasks/sync.py", "'TODO: finish sync'. Since 2021.", 20],
      ["tests", "Add a test for task ordering", "Prove I can count. Please.", 30],
    ],
  },
  {
    owner: "dungeon-co", name: "hexcrawl", language: "JavaScript", bornYear: 2019, hauntScore: 64, tomb: "headstone", ghost: "fedora",
    causeOfDeath: "Died waiting on a review that never came.",
    openingLine: "Seventeen pull requests. Not one reply. I stopped knocking.",
    quests: [
      ["issue", "Triage the stale pull requests", "Say yes, say no, just say something.", 30, true],
      ["build", "Get CI green again", "The build has been red longer than I've been dead.", 40, true],
      ["dependency", "Replace the deprecated canvas library", "It died before me. Rude.", 40],
      ["release", "Publish v1.0", "I never got a real birthday.", 50],
    ],
  },
  {
    owner: "astral-ledger", name: "moonvault", language: "JavaScript", bornYear: 2021, hauntScore: 86, tomb: "sepulchre", ghost: "girl",
    causeOfDeath: "Died when the hype did.",
    openingLine: "They said I was the future. The future stopped calling.",
    quests: [
      ["dependency", "Remove the abandoned wallet SDK", "Cut the cord. It isn't coming back.", 40],
      ["docs", "Rewrite the README without the roadmap", "Tell them what I am, not what I promised.", 20],
      ["build", "Fix the broken build on Node 20", "I can't even start any more.", 40],
      ["tests", "Add a smoke test", "One test. Just to know I'm breathing.", 30],
    ],
  },
  {
    owner: "tickworks", name: "cronwatch", language: "JavaScript", bornYear: 2018, hauntScore: 55, tomb: "headstone", ghost: "girl",
    causeOfDeath: "Died under 214 unread issues.",
    openingLine: "Tick. Tick. Nobody checks on the watcher.",
    quests: [
      ["issue", "Close the five oldest duplicate issues", "Some of them are the same scream, five times.", 20, true],
      ["issue", "Fix #88: timezone drift", "I'm an hour late. Every spring.", 40, true],
      ["release", "Tag a release with the fixes", "Let them know I'm awake.", 30, true],
    ],
  },
  {
    owner: "pyre-tools", name: "snakecharm-cli", language: "Python", bornYear: 2020, hauntScore: 47, tomb: "crypt", ghost: "fedora",
    causeOfDeath: "Died of a dependency that died first.",
    openingLine: "E_DEPENDENCY_GONE. Exit code: grief.",
    quests: [
      ["dependency", "Swap out the unmaintained argument parser", "My voice was borrowed. Give me my own.", 40],
      ["tests", "Add a test for --help", "At least let me introduce myself.", 20],
    ],
  },
  {
    owner: "inkwell", name: "typedrift", language: "TypeScript", bornYear: 2022, hauntScore: 68, tomb: "headstone", ghost: "girl",
    causeOfDeath: "Died of too many anys.",
    openingLine: "I was supposed to be typed. I became 'any'thing.",
    quests: [
      ["todo", "Replace the 'any' in parser.ts", "Give me a shape. Any shape. Not that one.", 30, true],
      ["build", "Turn on strict mode and fix the errors", "It'll hurt. I'm already dead.", 50],
      ["docs", "Document the public API", "Nobody knew how to talk to me.", 20],
    ],
  },
  {
    owner: "burrow-dev", name: "tunnelkit", language: "Go", bornYear: 2019, hauntScore: 79, tomb: "sepulchre", ghost: "fedora",
    causeOfDeath: "Died of a red build nobody opened.",
    openingLine: "The light at the end of my tunnel is a failing test.",
    quests: [
      ["build", "Fix the red build", "Open it. Look at it. It won't bite. Much.", 40],
      ["dependency", "Update to a supported Go version", "My runtime is older than some of my issues.", 30],
      ["issue", "Fix #4: connections leak", "I keep doors open that should close.", 40],
    ],
  },
  {
    owner: "oxide-yard", name: "rustbucket", language: "Rust", bornYear: 2021, hauntScore: 52, tomb: "crypt", ghost: "girl",
    causeOfDeath: "Died rewriting itself, again.",
    openingLine: "Version four was going to be the one. It wasn't.",
    quests: [
      ["todo", "Delete the half-finished v4 branch", "Let the old me go.", 20],
      ["build", "Fix clippy warnings", "Forty-one warnings. I counted. I had time.", 30],
      ["release", "Publish a crate release", "Let them actually install me.", 40],
    ],
  },
  {
    owner: "jd-builds", name: "todo-app-v3", language: "JavaScript", bornYear: 2021, hauntScore: 60, tomb: "headstone", ghost: "fedora",
    causeOfDeath: "Died with 41 boxes unchecked.",
    openingLine: "Forty-one boxes. I counted them every night.",
    quests: [
      ["todo", "Finish the 'mark all done' TODO", "The irony is not lost on me.", 20],
      ["tests", "Add tests for adding a task", "Make sure I can at least hold one thing.", 30],
      ["docs", "Write a README that tells the truth", "Not 'coming soon'. The truth.", 20],
    ],
  },
];

export const DEMO_PROJECTS: GraveProject[] = RAW.map((p) => {
  const id = `${p.owner}--${p.name}`;
  const quests: Quest[] = p.quests.map(([kind, title, hint, xp, done], i) => ({ id: `${id}#${i}`, kind, title, hint, xp, done: !!done }));
  return { ...p, id, quests };
});

export function findDemoProject(id: string) {
  return DEMO_PROJECTS.find((p) => p.id === id);
}
