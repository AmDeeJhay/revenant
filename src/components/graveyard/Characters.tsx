import type { CSSProperties, ReactNode } from "react";

/*
 * The cemetery's residents, drawn as silhouettes the way the night shows
 * them: near-black shapes with moonlight catching their upper-right edges,
 * lit here and there by a lantern or a candle. Each has a small idle life
 * (digging, a tail flicking, a scythe swaying) and reacts when you come
 * close; the reactions are driven by CSS from `data-near` on the wrapper.
 */

const INK = "#04050a";

/** A silhouette with a thin moonlit rim on its upper-right edges. */
function Rim({ d, fill = INK, rim = "rgba(150,170,225,0.32)", className }: { d: string; fill?: string; rim?: string; className?: string }) {
  return (
    <g className={className}>
      <path d={d} fill={rim} transform="translate(0.9 -0.9)" />
      <path d={d} fill={fill} />
    </g>
  );
}

function Svg({ vb, className = "", style, children }: { vb: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <svg viewBox={vb} className={`block h-full w-full overflow-visible ${className}`} style={style} aria-hidden="true">
      {children}
    </svg>
  );
}

/* ---------------------------------------------------------------- */
/*  The gravedigger                                                   */
/* ---------------------------------------------------------------- */

/** Digging a fresh grave by lantern light; dirt flies onto the pile behind him. */
export function Gravedigger() {
  return (
    <Svg vb="0 0 150 112">
      {/* the pile he's thrown up, and the open grave he's digging */}
      <path d="M0 110 C4 94 14 86 26 88 C30 82 38 84 42 92 L48 110 Z" fill="#17120d" />
      <path d="M8 96 l3 -2 l2 3 Z M20 90 l4 -1 l1 3 Z M33 94 l3 -2 l2 2 Z" fill="#2a2119" />
      <path d="M72 100 L142 100 L134 111 L64 111 Z" fill="#010102" />
      <path d="M72 100 L142 100 L140 103.5 L74 103.5 Z" fill="#2b2118" />
      <path d="M72 100 L142 100" stroke="rgba(150,170,225,0.25)" strokeWidth="0.8" />
      {/* lantern on the pile */}
      <g transform="translate(14 74)">
        <path d="M3 0 H11 L10 2.5 H4 Z" fill="#15120d" />
        <rect x="4" y="2.5" width="6" height="9" rx="0.8" fill="url(#rv-g-lantern)" className="rv-dig-lamp" />
        <path d="M3 11.5 H11 L10 13.5 H4 Z" fill="#15120d" />
      </g>
      {/* legs */}
      <Rim d="M36 110 L40 78 L47 78 L44 110 Z M48 110 L53 92 L49 78 L57 78 L61 93 L57 110 Z" />
      {/* upper body, arms and shovel swing together from the hips */}
      <g className="rv-dig">
        <Rim d="M40 80 C38 66 44 52 58 46 L66 52 C62 62 58 72 57 80 Z" />
        <g className="rv-dig-head">
          <Rim d="M58 41 a7 7 0 1 0 0.1 0 Z" />
          <Rim d="M52 35 L78 32.5 L78 35.5 L52 38 Z M57 35 C57 25 72 24 72 33 Z" />
        </g>
        <path d="M60 50 L80 62 M56 56 L77 68" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <path d="M74 56 L108 94" stroke="#140f0a" strokeWidth="2.8" strokeLinecap="round" />
        <Rim d="M104 90 L117 98 L110 109 L99 101 Z" fill="#14161b" rim="rgba(200,210,235,0.45)" />
        {/* clods thrown from the blade */}
        <g className="rv-clods" fill="#2a2119">
          <circle cx="108" cy="98" r="2" />
          <circle cx="111" cy="102" r="1.4" />
          <circle cx="104" cy="101" r="1.6" />
        </g>
      </g>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/*  The black cat                                                     */
/* ---------------------------------------------------------------- */

/** A black cat sitting up, tail flicking, eyes catching the light. */
export function BlackCat() {
  return (
    <Svg vb="0 0 44 48">
      <path className="rv-cat-tail" d="M31 46 C40 45 44 38 41 31 C40 28 37 27 36 30" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      <Rim d="M10 47 C6 38 8 27 14 22 C12 16 12 9 15 3 L19.5 10 C21.5 9.2 23.5 9.2 25.5 10 L30 3 C33 9 33 16 31 22 C37 27 39 38 35 47 Z" />
      <g className="rv-cat-eyes">
        <ellipse cx="18.5" cy="16" rx="1.9" ry="1.3" fill="#ffd23a" />
        <ellipse cx="26.5" cy="16" rx="1.9" ry="1.3" fill="#ffd23a" />
        <ellipse cx="18.5" cy="16" rx="0.45" ry="1.2" fill="#140c00" />
        <ellipse cx="26.5" cy="16" rx="0.45" ry="1.2" fill="#140c00" />
      </g>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/*  The reaper                                                        */
/* ---------------------------------------------------------------- */

/** The Grim Reaper, waiting in the fog with his scythe. */
export function Reaper() {
  return (
    <Svg vb="0 0 84 164">
      {/* scythe: shaft, then the long curved blade over his head */}
      <path d="M58 30 L54 162" stroke="#0d0a08" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M58 30 C44 18 22 18 4 32 C22 26 40 27 56 38 Z" fill="#1a1d24" />
      <path d="M4 32 C22 26 40 27 56 38" fill="none" stroke="rgba(215,225,245,0.55)" strokeWidth="0.8" />
      {/* robe, hood, the dark where a face should be */}
      <Rim d="M32 22 C23 32 19 72 16 112 C14 134 9 150 3 163 L62 163 C57 146 52 118 50 86 C48 64 47 44 45 32 C43 25 38 21 32 22 Z" />
      <Rim d="M25 30 C21 13 31 1 40 3 C49 5 51 18 47 33 C43 27 35 25 29 33 Z" />
      <ellipse cx="38.5" cy="21" rx="4.6" ry="7.2" fill="#000" />
      <g className="rv-reaper-eyes">
        <circle cx="36.6" cy="20" r="0.9" fill="#ff3a2a" />
        <circle cx="40.6" cy="20" r="0.9" fill="#ff3a2a" />
      </g>
      {/* sleeve and bony hand on the shaft */}
      <Rim d="M42 50 C48 52 53 56 57 61 L54 66 C49 62 44 60 39 60 Z" />
      <path d="M55 60 l3 1 l0.5 3 l-3 0.6 Z" fill="#b9b1a0" />
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/*  The scarecrow                                                     */
/* ---------------------------------------------------------------- */

/** A scarecrow with a jack-o'-lantern for a head, out in the field. */
export function Scarecrow() {
  return (
    <Svg vb="0 0 120 160">
      <path d="M60 160 V40 M10 54 H110" stroke="#0b0907" strokeWidth="4" strokeLinecap="round" />
      {/* ragged shirt and sleeves along the crossbar, straw at the cuffs */}
      <Rim d="M40 50 L80 50 L84 100 L76 93 L70 102 L62 95 L54 103 L47 94 L36 100 Z" fill="#0a0806" />
      <Rim d="M14 48 L42 48 L42 60 L28 62 L22 58 L16 63 Z M106 48 L78 48 L78 60 L92 62 L98 58 L104 63 Z" fill="#0a0806" />
      <path d="M14 52 l-6 -3 M14 55 l-7 1 M15 58 l-5 4 M106 52 l6 -3 M106 55 l7 1 M105 58 l5 4 M48 100 l-2 7 M58 101 l0 7 M70 101 l2 7" stroke="#5c4a23" strokeWidth="1" />
      {/* the pumpkin head, carved and lit */}
      <g className="rv-crow-head">
        {[
          [49, 32, 9, 12],
          [71, 32, 9, 12],
          [55, 32, 9, 13],
          [65, 32, 9, 13],
          [60, 32, 10, 13.5],
        ].map(([cx, cy, rx, ry], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#rv-g-pumpkin)" stroke="rgba(40,12,0,0.6)" strokeWidth="0.6" />
        ))}
        <path d="M51 29 L57 29 L54 24 Z M63 29 L69 29 L66 24 Z M47 35 Q60 45 73 35 L69 36 L67 39 L63 37 L60 41 L57 37 L53 39 L51 36 Z" fill="url(#rv-g-carve)" />
        {/* a floppy old hat */}
        <Rim d="M42 21 C50 17 70 17 80 21 L74 22 C72 12 66 2 58 0 C60 6 56 12 50 20 Z" fill="#090706" />
      </g>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/*  The weeping angel                                                 */
/* ---------------------------------------------------------------- */

/** A stone angel on a plinth, face hidden in her hands. */
export function Angel() {
  const wings = "M22 34 C8 44 4 76 14 100 C18 78 22 56 28 40 Z M48 34 C62 44 66 76 56 100 C52 78 48 56 42 40 Z";
  const body = "M26 32 C21 56 18 86 15 104 L55 104 C52 86 49 56 44 32 C40 28 30 28 26 32 Z";
  const head = "M35 14 a7 7.5 0 1 0 0.1 0 Z M29 22 C31 28 39 28 41 22 L42 30 C38 33 32 33 28 30 Z";
  return (
    <Svg vb="0 0 70 140">
      <g filter="url(#rv-stone)">
        <path d={wings} fill="url(#rv-g-stone)" />
        <path d={body} fill="url(#rv-g-stone)" />
        <path d={head} fill="url(#rv-g-stone)" />
        <path d="M10 104 H60 V112 H10 Z M14 112 H56 V136 H14 Z M8 136 H62 V140 H8 Z" fill="url(#rv-g-stone)" />
      </g>
      <g filter="url(#rv-lichen)" opacity="0.6">
        <path d={`${wings} ${body} M14 112 H56 V136 H14 Z`} fill="#fff" />
      </g>
      <path d="M30 50 C28 70 26 90 24 104 M40 50 C42 70 44 90 46 104 M35 44 V104" fill="none" stroke="rgba(10,12,16,0.5)" strokeWidth="0.8" />
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/*  The witch                                                         */
/* ---------------------------------------------------------------- */

/** A witch on her broomstick, cloak and hair streaming behind her. */
export function Witch() {
  return (
    <Svg vb="0 0 124 64">
      <path d="M12 42 L118 30" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M24 40 C16 37 8 35 0 33 C5 39 6 46 2 52 C10 47 17 46 26 44 Z" fill={INK} />
      <path className="rv-witch-cloak" d="M66 32 C52 26 40 22 28 27 C38 30 46 33 56 37 C46 39 39 44 34 50 C48 44 58 41 66 37 Z" fill={INK} />
      <path d="M64 36 C60 26 62 17 68 13 C72 11 76 13 78 17 C80 23 78 30 76 35 Z" fill={INK} />
      <path d="M74 11 a5 5 0 1 0 0.1 0 Z" fill={INK} />
      <path d="M66 9 L84 9 L78 7 C76 -1 68 -6 60 -9 C64 -3 68 2 70 7 Z" fill={INK} />
      <path d="M70 14 C63 16 57 16 52 21 C58 18 63 19 68 17 Z" fill={INK} />
      <path d="M72 34 L82 40 L88 39 M76 18 L88 27 L94 29" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

/** A will-o'-wisp: a small cold flame that drifts and fades. */
export function Wisp({ style }: { style?: CSSProperties }) {
  return <span className="rv-wisp" style={style} aria-hidden="true" />;
}
