# Tech

- Next.js App Router, TypeScript (strict), Tailwind CSS v4, dark theme only.
- GitHub App via `octokit`, read-only permissions.
- LLM behind a swappable interface in `src/lib/llm`. Store behind an interface in `src/lib/store` (in-memory for dev).
- Sound: Web Audio API only, synthesized, starts after the user lights the candle.
- Tests: Vitest unit tests beside code, fast-check for properties (haunt score), Playwright in `e2e/`.
- Pure logic (haunt score, quest generation) stays free of I/O.
- Accessibility: mute button always visible, calm mode, reduced-motion variant of every effect, nothing flashing more than 3 times per second.
