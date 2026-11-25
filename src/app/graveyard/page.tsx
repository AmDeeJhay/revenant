import type { Metadata } from "next";
import { GraveyardView } from "@/components/graveyard/GraveyardView";
import { DEMO_PROJECTS } from "@/lib/demo/projects";

export const metadata: Metadata = {
  title: "The Public Graveyard · Revenant",
};

// Demo data for now; this switches to the saved index once the index builder lands.
export default function Graveyard() {
  return <GraveyardView projects={DEMO_PROJECTS} />;
}
