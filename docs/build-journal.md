# Build journal

Newest entries first. Feeds the Kiro write-up.

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
