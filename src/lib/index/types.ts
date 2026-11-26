export type Language = "JavaScript" | "TypeScript" | "Python" | "Go" | "Rust";

/**
 * Which monument marks a grave. Each has a part that opens when you choose it:
 * a headstone's grave slab slides away, a sepulchre's round stone rolls aside,
 * a crypt's bronze doors swing open.
 */
export type TombStyle = "headstone" | "sepulchre" | "crypt";

/** Which ghost haunts a grave. */
export type GhostStyle = "fedora" | "girl";

/** The kind of unfinished business a quest is about. */
export type QuestKind = "build" | "dependency" | "issue" | "todo" | "docs" | "tests" | "release";

/** One piece of the ghost's unfinished business, built from real repo data. */
export type Quest = {
  id: string;
  kind: QuestKind;
  title: string;
  /** The ghost's hint, in its own voice. */
  hint: string;
  xp: number;
  /** Verified done (from GitHub; in demo mode, from the sample data). */
  done: boolean;
};

/** One abandoned project as shown in a graveyard. Public metadata only. */
export type GraveProject = {
  /** URL-safe id, `owner--name`. */
  id: string;
  owner: string;
  name: string;
  language: Language;
  bornYear: number;
  /** Short cause of death, written as a full sentence. */
  causeOfDeath: string;
  /** What the ghost says when you open its grave. */
  openingLine: string;
  /** 0 (calm) to 100 (most neglected), before any quests are done. */
  hauntScore: number;
  tomb: TombStyle;
  ghost: GhostStyle;
  quests: Quest[];
  /** Set when a signed-in user has claimed this ghost. */
  adoptedBy?: { login: string };
};
