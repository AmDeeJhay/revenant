import Link from "next/link";
import type { CSSProperties } from "react";
import { hauntStage, STAGE_LABEL } from "@/lib/haunt/stages";
import type { GraveProject, Language, TombStyle } from "@/lib/index/types";

/**
 * Headstone art. `wick` is where the candle flame sits, as a percentage of
 * the image box, so the animated flame lines up with the drawn candle.
 * Replace any SVG in /public/graveyard with the designer's export of the same
 * name, then nudge `wick` if the candle moved.
 */
const TOMBS: Record<TombStyle, { src: string; ratio: number; wick: { x: number; y: number } }> = {
  classic: { src: "/graveyard/tomb-classic.svg", ratio: 1, wick: { x: 25, y: 3 } },
  boulder: { src: "/graveyard/tomb-boulder.svg", ratio: 140 / 110, wick: { x: 83.6, y: 60.5 } },
  skull: { src: "/graveyard/tomb-skull.svg", ratio: 1, wick: { x: 29.2, y: 14 } },
};

const LANG_COLOR: Record<Language, string> = {
  JavaScript: "#e8c547",
  TypeScript: "#5b9dff",
  Python: "#6aa6ff",
  Go: "#5fd3e6",
  Rust: "#ff7ab8",
};

export function GraveCard({ project, index }: { project: GraveProject; index: number }) {
  const stage = hauntStage(project.hauntScore);
  const tomb = TOMBS[project.tomb];
  // Stable per-card offset so candles and shakes never move in sync.
  const seed = ((index * 7919) % 97) / 97;

  return (
    <article
      className="rv-card group relative flex flex-col rounded-2xl border border-white/[0.04] bg-[#0b1024] px-3.5 pb-3.5 pt-3 transition-[transform,border-color,background-color] duration-500 hover:-translate-y-1 hover:border-white/10 hover:bg-[#0e142d]"
      data-stage={stage}
      style={{ "--i": index, "--seed": seed, "--lang": LANG_COLOR[project.language] } as CSSProperties}
    >
      <span className="rv-lang absolute right-3 top-3 z-10 rounded-full border px-2 py-px font-mono text-[9px] leading-[14px]">
        {project.language}
      </span>

      <div className="relative mx-auto mt-3 flex h-[96px] items-end justify-center">
        <div className="rv-tomb relative h-[86px]" style={{ aspectRatio: tomb.ratio }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tomb.src} alt="" aria-hidden="true" draggable={false} className="h-full w-full select-none" />
          <span className="rv-candle" style={{ left: `${tomb.wick.x}%`, top: `${tomb.wick.y}%` }} aria-hidden="true" />
        </div>
        {project.adoptedBy && <AdopterBadge login={project.adoptedBy.login} />}
      </div>

      <h2 className="rv-name mt-2 truncate text-center font-display text-[13px] font-bold text-[#f1f3fa]">{project.name}</h2>
      <p className="mt-1 line-clamp-2 min-h-[2.5em] text-center text-[10.5px] leading-[1.25] text-[#aab3c7]">
        Here lies <b className="font-semibold text-[#e6e9f2]">{project.name}</b>. Born {project.bornYear}. {project.causeOfDeath}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <span className="rv-chip rounded px-2 py-[3px] font-mono text-[8.5px] font-bold uppercase tracking-wider">{STAGE_LABEL[stage]}</span>
        <span className="font-mono text-[10px] text-[#c9cfdd]">
          <span className="sr-only">Haunt level </span>
          {project.hauntScore}/100
        </span>
      </div>
      <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-[#1b2240]" aria-hidden="true">
        <span className="rv-bar block h-full rounded-full" style={{ width: `${project.hauntScore}%` }} />
      </div>

      <Link
        href={`/ghost/${project.id}`}
        className="rv-open mt-3.5 block rounded-full bg-[#ff8a00] py-2 text-center text-[11px] font-semibold text-white transition-[background-color,box-shadow,transform] duration-300 hover:bg-[#ff9a1f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd08a] active:scale-[0.98]"
        aria-label={`Open the grave of ${project.name}`}
      >
        Open Grave
      </Link>
    </article>
  );
}

function AdopterBadge({ login }: { login: string }) {
  return (
    <span
      className="rv-adopter absolute -right-5 top-0 grid h-11 w-11 place-items-center rounded-full border-[3px] border-[#1a1f33] bg-linear-to-br from-[#9b6bff] to-[#5b37c9] font-display text-sm font-bold uppercase text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_6px_18px_rgba(120,80,255,0.35)]"
      title={`Adopted by @${login}`}
    >
      {login.slice(0, 2)}
      <span className="sr-only">Adopted by @{login}</span>
    </span>
  );
}
