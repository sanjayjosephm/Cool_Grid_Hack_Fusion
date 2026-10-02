import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = { title: "CoolGrid", description: "Electrify Melbourne homes without leaving anyone in the heat." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="flex items-baseline gap-5 border-b border-line px-6 py-3.5 max-[520px]:flex-wrap max-[520px]:gap-x-4 max-[520px]:gap-y-2">
          <strong className="mr-auto font-serif text-xl">CoolGrid</strong>
          <Link className="text-ink no-underline" href="/">Overview</Link>
          <Link className="text-ink no-underline" href="/dashboard">Resilience map</Link>
          <Link className="text-ink no-underline" href="/methodology">Method and limits</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
