import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Revenant",
  description: "A haunted graveyard for abandoned code. Fix it, and the ghost is resurrected.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
