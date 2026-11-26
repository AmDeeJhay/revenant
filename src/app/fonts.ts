import { Cinzel, Cormorant_Garamond, Courier_Prime, Delius, Inter, JetBrains_Mono, Share_Tech_Mono } from "next/font/google";

// Closest Google Fonts to the design. Swap here if the designer names exact faces.
export const titleFont = Share_Tech_Mono({ weight: "400", subsets: ["latin"], variable: "--font-sharetech", display: "swap" });
export const displayFont = JetBrains_Mono({ weight: ["700", "800"], subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
export const handFont = Delius({ weight: "400", subsets: ["latin"], variable: "--font-delius", display: "swap" });
export const monoFont = Courier_Prime({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-courier", display: "swap" });
export const sansFont = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Graveyard: Roman capitals cut into stone, and an old book face for epitaphs.
export const carvedFont = Cinzel({ weight: ["600", "700"], subsets: ["latin"], variable: "--font-cinzel", display: "swap" });
// Only ever used in italic, at one weight: one small file.
export const epitaphFont = Cormorant_Garamond({ weight: "400", style: "italic", subsets: ["latin"], variable: "--font-cormorant", display: "swap" });

export const fontVariables = [titleFont, displayFont, handFont, monoFont, sansFont, carvedFont, epitaphFont].map((f) => f.variable).join(" ");
