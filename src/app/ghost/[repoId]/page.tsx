import Link from "next/link";
import { notFound } from "next/navigation";
import { findDemoProject } from "@/lib/demo/projects";

// Placeholder until the séance design arrives.
export default async function GhostPage({ params }: { params: Promise<{ repoId: string }> }) {
  const { repoId } = await params;
  const project = findDemoProject(repoId);
  if (!project) notFound();

  return (
    <main className="grid min-h-screen place-items-center bg-[#050815] px-6 text-center">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#f4f6fb]">{project.name}</h1>
        <p className="mt-3 font-mono text-sm text-[#a3adbd]">The séance room is still being prepared.</p>
        <Link href="/graveyard" className="mt-6 inline-block text-sm text-[#ff8a00] underline-offset-4 hover:underline">
          Back to the graveyard
        </Link>
      </div>
    </main>
  );
}
