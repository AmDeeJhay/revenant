import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AudioControls } from "@/components/AudioControls";
import { fontVariables } from "./fonts";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Revenant",
  description: "A haunted graveyard for abandoned open-source code. Fix it, and the ghost is resurrected.",
};

export const viewport: Viewport = {
  themeColor: "#05070d",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-screen font-sans antialiased">
        {children}
        <AudioControls />
      </body>
    </html>
  );
}
