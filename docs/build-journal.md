# Build journal

Newest entries first. Feeds the Kiro write-up.

## 2026-11-25: Public Graveyard
- Built `/graveyard` from the design: header with search, title, live status line ("showing X/Y spirits · N banshees · M risen"), 5-column grid of graves, cobweb, and two ghosts.
- Each grave shows language, epitaph, haunt stage chip, haunt bar and an "Open Grave" link. Demo data lives in `src/lib/demo/projects.ts` (fictional names); stage thresholds in `src/lib/haunt/stages.ts`.
- Motion: cards rise out of the ground in sequence, haunt bars fill, candle flames dance and cast flickering light, headstones bob (Restless) or rattle (Poltergeist, Banshee), banshee cards pulse red, the cobweb stirs, the girl ghost drifts and the hat ghost peeks in from the edge, floor fog and dust, cursor candlelight, grain.
- Verified with a real static export rendered in a headless browser.

## 2026-11-25: Landing page
- Built the entrance scene from the "Desktop - 1" design: dead tree, hill with crosses, a hand clawing out of the ground, headstone, two jack-o'-lanterns, title, tagline and the "Light the Candle" button.
- Each art layer is a separate SVG in `public/landing/`, so the designer's exports can replace them by file name.
- Motion: fade up from black, the ground rumbles as the hand breaks through and flings earth, mouse parallax across 8 depths, canvas fog in three bands, dust motes and pumpkin embers, candle flicker on the pumpkins, a light that follows the cursor, film grain, a title glitch every 9 s, and a breathing button glow.
- Clicking the button strikes a synthesized match, ignites a flame, floods the screen with candlelight and leads to `/graveyard`. Sound (drone and wind) starts only on that click. Mute is always visible.
- Reduced motion shows the end state of every effect.

## 2026-11-25: Scaffold
- Project structure scaffolded.
