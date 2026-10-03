import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import { Fraunces, Inter } from "next/font/google";
import type { ReactNode } from "react";

const display = Fraunces({ subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-sans", display: "swap" });

export const metadata = { title: "CoolGrid", description: "Test whether council heatwave and flood arrangements still work when the power fails, a crossing closes or staff run short." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        {/* Lets CSS hide .reveal content only when JavaScript is running to reveal it again. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <SiteNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
