import type { Metadata } from "next";
import "@/styles/globals.css";
import "@/styles/controls.css";
import "@/styles/animations.css";
import "@/styles/editor.css";
import "@/styles/legacy-effects.css";
import "@/styles/overlay.css";

export const metadata: Metadata = { title: "Silence's Overlay Maker", description: "Create and publish stream overlays" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link href="https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet"/></head><body>{children}</body></html>;
}
