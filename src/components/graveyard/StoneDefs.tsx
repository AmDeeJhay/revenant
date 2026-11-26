/**
 * Shared SVG filters that turn flat shapes into weathered materials lit by
 * the moon (upper right). Render once per page; monuments reference them by id.
 *
 * Each material works the same way: fractal noise becomes a bump map, the
 * shape's blurred edge becomes a bevel, a distant light shades both, and the
 * result is multiplied over the shape's own colour (its albedo) and clipped
 * back to the shape.
 *
 * Arithmetic composites keep the bump's alpha below 1 inside the shape; if it
 * saturated, the surface would light flat and lose its texture.
 */

const MOON = { azimuth: -48, elevation: 34 };

export function StoneDefs() {
  return (
    <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden="true" focusable="false">
      <defs>
        {/* Albedo gradients: lighter toward the moon (upper right). */}
        <linearGradient id="rv-g-stone" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#5b616b" />
          <stop offset="0.6" stopColor="#737983" />
          <stop offset="1" stopColor="#8a8f98" />
        </linearGradient>
        <linearGradient id="rv-g-stone-warm" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#857f78" />
          <stop offset="1" stopColor="#aaa49b" />
        </linearGradient>
        <linearGradient id="rv-g-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#30353e" />
          <stop offset="1" stopColor="#3f454f" />
        </linearGradient>
        <linearGradient id="rv-g-rock" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#47464a" />
          <stop offset="0.55" stopColor="#5f5e60" />
          <stop offset="1" stopColor="#75757a" />
        </linearGradient>
        <linearGradient id="rv-g-bronze" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#33291e" />
          <stop offset="0.6" stopColor="#4d3d2b" />
          <stop offset="1" stopColor="#634c34" />
        </linearGradient>
        {/* Halloween: pumpkin rind, the glow inside a carved face, old bone, a lantern's glass. */}
        <radialGradient id="rv-g-pumpkin" cx="0.6" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#c2621a" />
          <stop offset="0.55" stopColor="#8a3a0b" />
          <stop offset="1" stopColor="#3a1404" />
        </radialGradient>
        <radialGradient id="rv-g-carve" cx="0.5" cy="0.6" r="0.6">
          <stop offset="0" stopColor="#fff6c4" />
          <stop offset="0.45" stopColor="#ffc247" />
          <stop offset="1" stopColor="#e0620c" />
        </radialGradient>
        <linearGradient id="rv-g-bone" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9d3c2" />
          <stop offset="0.6" stopColor="#a39c8a" />
          <stop offset="1" stopColor="#5e584c" />
        </linearGradient>
        <radialGradient id="rv-g-lantern" cx="0.5" cy="0.55" r="0.6">
          <stop offset="0" stopColor="#fffbe0" />
          <stop offset="0.5" stopColor="#ffcf6a" />
          <stop offset="1" stopColor="#e8801e" />
        </radialGradient>
        <radialGradient id="rv-g-bulb-o">
          <stop offset="0" stopColor="rgba(255,150,50,0.85)" />
          <stop offset="1" stopColor="rgba(255,120,20,0)" />
        </radialGradient>
        <radialGradient id="rv-g-bulb-v">
          <stop offset="0" stopColor="rgba(170,100,255,0.85)" />
          <stop offset="1" stopColor="rgba(140,70,255,0)" />
        </radialGradient>
        {/* Turf: solid at the blades, melting into the ground below. */}
        <linearGradient id="rv-g-turf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" stopColor="#04060b" />
          <stop offset="1" stopColor="#04060b" stopOpacity="0" />
        </linearGradient>
        {/* The dark inside a tomb: blackest at the back. */}
        <radialGradient id="rv-g-pit" cx="0.5" cy="0.25" r="0.85">
          <stop offset="0" stopColor="#010204" />
          <stop offset="0.7" stopColor="#06080c" />
          <stop offset="1" stopColor="#141820" />
        </radialGradient>
        {/* Masks (object bounding box): only the lower part, only the upper part. */}
        <linearGradient id="rv-g-low" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" stopColor="#000" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <linearGradient id="rv-g-high" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.75" stopColor="#000" />
        </linearGradient>
        <mask id="rv-m-low" maskContentUnits="objectBoundingBox">
          <rect width="1" height="1" fill="url(#rv-g-low)" />
        </mask>
        <mask id="rv-m-high" maskContentUnits="objectBoundingBox">
          <rect width="1" height="1" fill="url(#rv-g-high)" />
        </mask>

        {/* Granite and limestone: fine grain, soft mottling, bevelled edges with a cold sheen. */}
        <filter id="rv-stone" x="-4%" y="-4%" width="108%" height="108%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="4" result="grain" />
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.026" numOctaves="4" seed="17" result="mottle" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="soft" />
          <feComposite in="grain" in2="soft" operator="arithmetic" k2="0.2" k3="0.78" result="bump" />
          <feDiffuseLighting in="bump" surfaceScale="3.2" diffuseConstant="1.25" lightingColor="#d6def0" result="diffuse">
            <feDistantLight {...MOON} />
          </feDiffuseLighting>
          <feColorMatrix in="mottle" type="matrix" values="0.8 0 0 0 0.38  0.8 0 0 0 0.38  0.8 0 0 0 0.4  0 0 0 0 1" result="tone" />
          <feBlend in="SourceGraphic" in2="diffuse" mode="multiply" result="lit" />
          <feBlend in="lit" in2="tone" mode="multiply" result="toned" />
          <feSpecularLighting in="soft" surfaceScale="3.2" specularConstant="0.5" specularExponent="16" lightingColor="#cbd8ff" result="spec">
            <feDistantLight {...MOON} />
          </feSpecularLighting>
          <feComposite in="toned" in2="spec" operator="arithmetic" k2="1" k3="0.45" result="shine" />
          <feComposite in="shine" in2="SourceAlpha" operator="in" />
        </filter>

        {/* Raw rock: big craggy relief over fine grit, no polish. */}
        <filter id="rv-rock" x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" seed="23" result="crag" />
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="5" result="grit" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="soft" />
          <feComposite in="crag" in2="soft" operator="arithmetic" k2="0.45" k3="0.5" result="relief" />
          <feComposite in="grit" in2="relief" operator="arithmetic" k2="0.07" k3="1" result="bump" />
          <feDiffuseLighting in="bump" surfaceScale="15" diffuseConstant="1.35" lightingColor="#d0d8ec" result="diffuse">
            <feDistantLight azimuth={MOON.azimuth} elevation={34} />
          </feDiffuseLighting>
          <feBlend in="SourceGraphic" in2="diffuse" mode="multiply" result="lit" />
          <feComposite in="lit" in2="SourceAlpha" operator="in" />
        </filter>

        {/* Old bronze: hammered surface, a hard metallic highlight. */}
        <filter id="rv-bronze" x="-4%" y="-4%" width="108%" height="108%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="8" result="grain" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" result="soft" />
          <feComposite in="grain" in2="soft" operator="arithmetic" k2="0.1" k3="0.85" result="bump" />
          <feDiffuseLighting in="bump" surfaceScale="2.5" diffuseConstant="1.1" lightingColor="#d8dcea" result="diffuse">
            <feDistantLight {...MOON} />
          </feDiffuseLighting>
          <feSpecularLighting in="bump" surfaceScale="2.5" specularConstant="0.9" specularExponent="22" lightingColor="#e8d9b8" result="spec">
            <feDistantLight {...MOON} />
          </feSpecularLighting>
          <feBlend in="SourceGraphic" in2="diffuse" mode="multiply" result="lit" />
          <feComposite in="lit" in2="spec" operator="arithmetic" k2="1" k3="0.55" result="shine" />
          <feComposite in="shine" in2="SourceAlpha" operator="in" />
        </filter>

        {/* Lichen: pale grey-green crusts in patches. Apply to a copy of the shape. */}
        <filter id="rv-lichen" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.16" numOctaves="4" seed="31" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.46  0 0 0 0 0.48  0 0 0 0 0.42  5 0 0 0 -2.95" result="blot" />
          <feComposite in="blot" in2="SourceAlpha" operator="in" />
        </filter>

        {/* Dark moss, thicker and lower. */}
        <filter id="rv-moss" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="3" seed="44" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.09  0 0 0 0 0.13  0 0 0 0 0.09  8 0 0 0 -4.2" result="blot" />
          <feComposite in="blot" in2="SourceAlpha" operator="in" />
        </filter>

        {/* Verdigris on bronze. */}
        <filter id="rv-verdigris" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.12" numOctaves="4" seed="12" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.34  0 0 0 0 0.31  4 0 0 0 -2.2" result="blot" />
          <feComposite in="blot" in2="SourceAlpha" operator="in" />
        </filter>

        {/* Rain streaks of grime running down from the top. */}
        <filter id="rv-grime" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.32 0.011" numOctaves="2" seed="9" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.03  0 0 0 0 0.04  0 0 0 0 0.04  4 0 0 0 -2.05" result="streak" />
          <feComposite in="streak" in2="SourceAlpha" operator="in" />
        </filter>

        {/* Turf and soil for the ground. */}
        <filter id="rv-soil" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.35" numOctaves="3" seed="2" result="n" />
          <feDiffuseLighting in="n" surfaceScale="2" diffuseConstant="1" lightingColor="#7d8aa8" result="d">
            <feDistantLight azimuth={MOON.azimuth} elevation={30} />
          </feDiffuseLighting>
          <feBlend in="SourceGraphic" in2="d" mode="multiply" result="lit" />
          <feComposite in="lit" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}
