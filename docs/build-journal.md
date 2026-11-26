# Build journal

Newest entries first. Feeds the Kiro write-up.

## 2026-11-26: A cemetery with people in it
- The yard is now a real place in perspective (`camera.ts`): graves stand along both sides of a winding, leaf-strewn path that runs from your feet to the horizon, each on its own earth plot with a soft moon shadow falling toward you. Haze grows with distance; the far ridge, chapel and trees melt into fog; a great black tree, out-of-focus stones and the lit iron fence frame the front. Moonbeams, leaves blowing through, will-o'-wisps.
- Residents (`Characters.tsx`), each with an idle life and a reaction when you come near: a gravedigger digging a fresh grave by lantern light (stops and looks up), a black cat on a tombstone (tail flicks, eyes go wide), the Grim Reaper waiting in the fog (eyes ignite, he whispers), a jack-o'-lantern scarecrow with a crow on its arm (turns its head), a weeping-angel statue, and a witch crossing the moon. Residents find a free gap between graves on any screen size.
- The lantern-bearer is the guide (`Guide.tsx`), replacing the search box. Ask in your own words ("an angry go one", "something nearly at rest", "docs", "hexcrawl", "surprise me"; parsed by `src/lib/haunt/seek.ts`, tested). They walk the path to the grave leaving a trail of lantern light, tell you who lies there and what's left undone, offer the other matches, and open the tomb with a spell of lantern light that streams into it. "/" asks them.
- Performance rule for the scene: anything animated gets its own layer, static art carries no live CSS filters (trees are mask-painted silhouettes, haze is opacity), and glows use plain alpha instead of `mix-blend-mode`. About 25 fps in headless software rendering (the landing page does 15 to 25).

## 2026-11-26: The graveyard becomes a cemetery
- Replaced the card grid with a moonlit Halloween cemetery: rows of graves on a hillside receding into fog, a far ridge with a chapel, crosses and an iron fence, bare trees in the mist, bats crossing the moon, and a wrought-iron fence strung with orange and violet lights at the front.
- Monuments are drawn, not pasted: SVG shapes textured by shared filters (`StoneDefs.tsx`) that turn noise into granite, raw rock and old bronze lit by the moon. Names, years and epitaphs are carved into the stone. Three kinds, each with a part that opens: a headstone whose grave slab slides off the pit, a rock-cut sepulchre whose round stone rolls along its groove, and a crypt whose bronze doors swing inward. `TombStyle` is now `headstone | sepulchre | crypt`.
- Neglect shows on the stone: lichen, grime, moss, cracks and a lean, all driven by the haunt score. Each fixed quest lights a votive candle and mends the stone; a resurrected tomb is clean, flowering and warm. Shut tombs leak light and mist by mood (red for banshees) and rattle as something knocks inside.
- Ghosts are only seen inside: choose a tomb and the camera flies in, it opens (stone grind or creaking hinges, synthesized), the ghost rises out of it, and its unfinished business is laid out beside it. Leaving runs it backwards and seals the tomb.
- Halloween dressing per grave: jack-o'-lanterns, skulls, crows, cobwebs on crypts, coloured uplights, hands clawing up at the angriest graves, R.I.P. stones with a carved skull, fallen leaves.
- Search is the lantern-bearer: a hooded figure walks to the matching grave and lights it; Up/Down moves between matches, Enter opens it.
- Performance: animated SVG children (grass blades, light bulbs, pumpkin faces) were forcing the stone filters to re-rasterize every frame (under 1 fps in software rendering). Static art now sits on its own compositor layers and animations run on whole elements: about 20 fps in headless software rendering, on par with the landing page.
- Removed the edge-lurker ghosts and the old card, PNG tomb and cobweb components.

## 2026-11-25: Graveyard haunting and resurrection
- Swapped the graveyard SVGs for the designer's PNGs: `tomb-rip.png`, `tomb-boulder.png`, `tomb-computer.png`, `ghost-fedora.png`, `ghost-girl.png`, `cobweb.png`. Removed the "NI" adopter avatar on hexcrawl (a Figma comment that slipped into the build).
- Every grave has its own ghost behind the stone. Its mood follows the haunt stage: calm ghosts are faint and drift; Poltergeist and Banshee ghosts lurch, glow and their eyes burn red. They lean toward the cursor and whisper (or moan) when you come near. Ghosts look ectoplasmic: translucent, a trailing afterimage, edges rippling through an SVG displacement filter.
- Life returns as quests are fixed (`src/lib/haunt/life.ts`, property-tested): haunt score falls, the card shifts from night blue to green, dead brown stubs grow into green grass, moss creeps up the stone, flowers open one by one. All quests fixed = resurrected: light rays behind the stone, golden ghost floating peacefully, "Visit the Living".
- Séance dialog ("Open Grave"): big ghost over the grave, its opening line, haunt and life meters, and its unfinished business as quests with hints in the ghost's voice. Demo mode lets you mark quests fixed (saved in this browser); the ghost reacts encouragingly to each fix; the last one plays the resurrection (stone shakes, light floods, ghost ascends, morning breaks).
- Two lurker ghosts at the edges: touch one and it lunges with burning eyes and a shriek while the yard shudders.
- Sound: ghost whispers/moans, an angry shriek, a "breath of life" chime with rustling leaves per fix, and a resurrection with stone crack, rush of light, organ chord, choir and bells. The entrance storm continues with distant lightning and thunder, plus ghost voices drifting around you.
- Demo data now carries quests, an opening line and a ghost per grave; one grave (cronwatch) starts resurrected so every state is visible.

## 2026-11-25: Public Graveyard
- Built `/graveyard` from the design: header with search, title, live status line ("showing X/Y spirits · N banshees · M risen"), 5-column grid of graves, cobweb, and two ghosts.
- Each grave shows language, epitaph, haunt stage chip, haunt bar and an "Open Grave" link. Demo data lives in `src/lib/demo/projects.ts` (fictional names); stage thresholds in `src/lib/haunt/stages.ts`.
- Motion: cards rise out of the ground in sequence, haunt bars fill, candle flames dance and cast flickering light, headstones bob (Restless) or rattle (Poltergeist, Banshee), banshee cards pulse red, the cobweb stirs, the girl ghost drifts and the hat ghost peeks in from the edge, floor fog and dust, cursor candlelight, grain.
- Verified with a real static export rendered in a headless browser.

## 2026-11-25: Landing page, storm pass
- Swapped the placeholder SVGs for the designer's PNGs: `ground.png` (hill, crosses, headstone, jack-o'-lanterns), `tree.png`, `hand.png`, and `cracks.png`, which is used as a light mask over the ground's fissures. The stage is now 1440 x 1026 so the ground art maps 1:1.
- Opening like a horror cold open: the hand claws up in struggling heaves while the screen shakes in an earthquake (JS shake and synthesized rumble share one envelope), earth flies when it breaks the surface, then a close lightning strike and thunderclap. The storm continues with random strikes (multi-stroke flashes, procedural branching bolts, clouds lit from inside, thunder delayed by distance) and aftershocks every 18 to 34 s.
- Moon behind drifting storm clouds, moonlight rim on the silhouettes.
- The candle now lives inside the button: a wax candle with a smouldering, smoking wick. Clicking it throws match sparks, lights a layered flame that flickers from JS, and turns the button into a lantern lit from within. Then the light floods the screen.
- Sound fixed: SFX were routed through a master that faded in from silence, and the noise was too dark to survive the strike's filter. Rebuilt with proper white, pink and brown noise, an outdoor reverb and a limiter. Added wind gusts with a howl, a creaking branch, thunder, an earthquake, and a full match-to-flame candle sequence.
- Sound is on by default: it tries to start on load and otherwise starts on the first click, tap or key press (browser autoplay rule). The mute key was renamed to `revenant:muted:v2`, because the old toggle let people save "muted" while trying to turn sound on.
- Reduced motion: no flashes or shake; thunder still plays.

## 2026-11-25: Landing page
- Built the entrance scene from the "Desktop - 1" design: dead tree, hill with crosses, a hand clawing out of the ground, headstone, two jack-o'-lanterns, title, tagline and the "Light the Candle" button.
- Each art layer is a separate SVG in `public/landing/`, so the designer's exports can replace them by file name.
- Motion: fade up from black, the ground rumbles as the hand breaks through and flings earth, mouse parallax across 8 depths, canvas fog in three bands, dust motes and pumpkin embers, candle flicker on the pumpkins, a light that follows the cursor, film grain, a title glitch every 9 s, and a breathing button glow.
- Clicking the button strikes a synthesized match, ignites a flame, floods the screen with candlelight and leads to `/graveyard`. Sound (drone and wind) starts only on that click. Mute is always visible.
- Reduced motion shows the end state of every effect.

## 2026-11-25: Scaffold
- Project structure scaffolded.
