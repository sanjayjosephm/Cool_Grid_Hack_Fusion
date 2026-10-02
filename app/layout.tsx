import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = { title: "CoolGrid", description: "Electrify Melbourne homes without leaving anyone in the heat." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <strong>CoolGrid</strong>
          <Link href="/">Overview</Link>
          <Link href="/dashboard">Resilience map</Link>
          <Link href="/methodology">Method and limits</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
