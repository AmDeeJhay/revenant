"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FogCanvas, type FogBand } from "@/components/effects/FogCanvas";
import { Motes } from "@/components/effects/Motes";
import { hauntStage } from "@/lib/haunt/stages";
import type { GraveProject } from "@/lib/index/types";
import { GraveCard } from "./GraveCard";

const FLOOR_FOG: FogBand[] = [
  { y: 0.78, spread: 0.08, count: 14, size: [0.25, 0.4], alpha: [0.05, 0.1], speed: [0.003, 0.008] },
  { y: 0.98, spread: 0.04, count: 18, size: [0.3, 0.5], alpha: [0.08, 0.15], speed: [-0.008, -0.003] },
];

function matches(p: GraveProject, q: string) {
  return [p.name, p.owner, p.language, p.causeOfDeath].some((s) => s.toLowerCase().includes(q));
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function GraveyardView({ projects }: { projects: GraveProject[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query).trim().toLowerCase();

  const shown = useMemo(() => (q ? projects.filter((p) => matches(p, q)) : projects), [projects, q]);
  const banshees = shown.filter((p) => hauntStage(p.hauntScore) === "banshee").length;
  const risen = shown.filter((p) => p.resurrected).length;

  // Candlelight that follows the pointer, and "/" to jump to search.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onMove = (e: PointerEvent) => {
      root.style.setProperty("--cx", `${e.clientX}px`);
      root.style.setProperty("--cy", `${e.clientY}px`);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={rootRef} className="rv-yard relative min-h-screen overflow-x-hidden bg-[#050815]">
      {/* atmosphere, behind content */}
      <div className="rv-yard-sky pointer-events-none fixed inset-0" aria-hidden="true" />
      <FogCanvas bands={FLOOR_FOG} tint="140,165,205" className="pointer-events-none fixed inset-0 h-full w-full" />
      <Motes dust={36} className="pointer-events-none fixed inset-0 h-full w-full" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/graveyard/cobweb.svg" alt="" aria-hidden="true" className="rv-web pointer-events-none absolute right-0 top-0 w-[min(46vw,440px)] select-none" />

      <header className="relative z-10 border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-[1180px] items-center gap-6 px-6 py-5 sm:gap-12 sm:px-10">
          <Link href="/" className="flex shrink-0 items-center font-title text-[28px] leading-none text-[#f4f6fb]" aria-label="Revenant home">
            <span aria-hidden="true">{"{"}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/ghost.svg" alt="" aria-hidden="true" className="rv-ghost mx-[1px] w-[18px]" />
            <span>Revenant</span>
            <span aria-hidden="true">{"}"}</span>
          </Link>
          <label className="relative w-full max-w-[190px]">
            <span className="sr-only">Search the dead</span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the dead"
              className="w-full rounded-full border border-white/50 bg-transparent px-3.5 py-[7px] text-[11px] text-[#e7ecf5] placeholder:text-[#8a93a8] transition-[border-color,box-shadow] duration-300 focus:border-[#ff8a00]/80 focus:shadow-[0_0_0_3px_rgba(255,138,0,0.18),0_0_22px_rgba(255,138,0,0.18)] focus:outline-none"
            />
          </label>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1180px] px-6 pb-40 pt-9 sm:px-10">
        <h1 className="rv-reveal font-display text-[clamp(1.8rem,3.2vw,2.6rem)] font-extrabold leading-tight text-[#f6f7fb]" style={{ animationDelay: "0.15s" }}>
          The Public Graveyard
        </h1>
        <p className="rv-reveal mt-1 text-[13px] text-[#a6aec0]" style={{ animationDelay: "0.3s" }}>
          Abandoned open-source projects, waiting for someone to finish what they started.
        </p>
        <p className="rv-reveal mt-1 font-mono text-[12px] text-[#3ddc84]" style={{ animationDelay: "0.42s" }} aria-live="polite">
          » showing {shown.length}/{projects.length} spirits · {plural(banshees, "banshee")} · {risen} risen
        </p>

        {shown.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {shown.map((p, i) => (
              <GraveCard key={p.id} project={p} index={i} />
            ))}
          </div>
        ) : (
          <p className="mt-16 text-center font-mono text-sm text-[#8a93a8]">No spirit answers to “{query.trim()}”.</p>
        )}
      </main>

      {/* ghosts drifting in front of the yard */}
      <div className="pointer-events-none fixed bottom-0 left-[1%] z-20 hidden w-[clamp(90px,10vw,150px)] md:block" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/graveyard/ghost-girl.svg" alt="" className="rv-ghost-girl w-full" />
      </div>
      <div className="pointer-events-none fixed bottom-0 right-0 z-20 hidden w-[clamp(64px,6.5vw,104px)] md:block" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/graveyard/ghost-fedora.svg" alt="" className="rv-ghost-peek w-full" />
      </div>

      <div className="rv-cursor-light pointer-events-none fixed inset-0 z-30" aria-hidden="true" />
      <div className="rv-grain pointer-events-none fixed inset-0 z-30" aria-hidden="true" />
      <div className="rv-fade-in pointer-events-none fixed inset-0 z-40 bg-[#020308]" aria-hidden="true" />
    </div>
  );
}
