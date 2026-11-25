export type Language = "JavaScript" | "TypeScript" | "Python" | "Go" | "Rust";

/** Which headstone art a grave uses. */
export type TombStyle = "classic" | "boulder" | "skull";

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
  /** 0 (calm) to 100 (most neglected). */
  hauntScore: number;
  tomb: TombStyle;
  /** Set when a signed-in user has claimed this ghost. */
  adoptedBy?: { login: string };
  resurrected?: boolean;
};
