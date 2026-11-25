import type { GraveProject } from "@/lib/index/types";

/**
 * Demo-mode graves. All names are fictional so demo mode never points at,
 * or jokes about, a real project or person.
 */
const RAW: Omit<GraveProject, "id">[] = [
  { owner: "lantern-labs", name: "pixel-pantry", language: "JavaScript", bornYear: 2022, causeOfDeath: "Died of a missing .env file.", hauntScore: 58, tomb: "classic" },
  { owner: "quietbyte", name: "tidy-tasks", language: "Python", bornYear: 2021, causeOfDeath: "Died of scope creep.", hauntScore: 31, tomb: "skull" },
  { owner: "dungeon-co", name: "hexcrawl", language: "JavaScript", bornYear: 2019, causeOfDeath: "Died waiting on a review that never came.", hauntScore: 64, tomb: "classic", adoptedBy: { login: "nightowl" } },
  { owner: "astral-ledger", name: "moonvault", language: "JavaScript", bornYear: 2021, causeOfDeath: "Died when the hype did.", hauntScore: 86, tomb: "boulder" },
  { owner: "tickworks", name: "cronwatch", language: "JavaScript", bornYear: 2018, causeOfDeath: "Died under 214 unread issues.", hauntScore: 55, tomb: "classic" },
  { owner: "pyre-tools", name: "snakecharm-cli", language: "Python", bornYear: 2020, causeOfDeath: "Died of a dependency that died first.", hauntScore: 47, tomb: "classic" },
  { owner: "inkwell", name: "typedrift", language: "TypeScript", bornYear: 2022, causeOfDeath: "Died of too many anys.", hauntScore: 68, tomb: "classic" },
  { owner: "burrow-dev", name: "tunnelkit", language: "Go", bornYear: 2019, causeOfDeath: "Died of a red build nobody opened.", hauntScore: 79, tomb: "classic" },
  { owner: "oxide-yard", name: "rustbucket", language: "Rust", bornYear: 2021, causeOfDeath: "Died rewriting itself, again.", hauntScore: 52, tomb: "skull" },
  { owner: "jd-builds", name: "todo-app-v3", language: "JavaScript", bornYear: 2021, causeOfDeath: "Died with 41 boxes unchecked.", hauntScore: 60, tomb: "classic" },
];

export const DEMO_PROJECTS: GraveProject[] = RAW.map((p) => ({ ...p, id: `${p.owner}--${p.name}` }));

export function findDemoProject(id: string) {
  return DEMO_PROJECTS.find((p) => p.id === id);
}
