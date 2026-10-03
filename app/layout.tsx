import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import type { ReactNode } from "react";

const display = Fraunces({ subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-sans", display: "swap" });

export const metadata = { title: "CoolGrid", description: "Electrify Melbourne homes without leaving anyone in the heat." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        {/* Lets CSS hide .reveal content only when JavaScript is running to reveal it again. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <nav className="flex items-baseline print:hidden gap-5 border-b border-line bg-paper px-6 py-3.5 max-[520px]:flex-wrap max-[520px]:gap-x-4 max-[520px]:gap-y-2">
          <strong className="mr-auto font-serif text-xl">CoolGrid</strong>
          <Link className="text-ink no-underline" href="/">Overview</Link>
          <Link className="text-ink no-underline" href="/dashboard">Resilience map</Link>
          <Link className="text-ink no-underline" href="/validation">Validation</Link>
          <Link className="text-ink no-underline" href="/methodology">Method and limits</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
