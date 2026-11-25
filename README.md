# Revenant

A haunted graveyard for abandoned code. Every dead open source project gets a tombstone and a ghost that nags you until someone fixes it. Fix it, and the ghost is resurrected.

Built for Kiroween 2026 (category: Resurrection) with Kiro.

## Develop

```
npm install
npm run dev
npm test
```

Copy `.env.example` to `.env.local` and fill in values. Never commit secrets.

## Layout

- `.kiro/` steering, specs, hooks, MCP settings (public, required)
- `src/app/` pages and API routes
- `src/lib/` haunt, ghost, quests, github, index, llm, store, demo, audio, security
- `scripts/` index builder and demo seeding
- `docs/` architecture and build journal

## License

MIT
