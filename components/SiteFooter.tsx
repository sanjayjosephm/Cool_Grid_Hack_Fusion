import Link from "next/link";
import { Logo } from "./SiteNav";

export default function SiteFooter() {
  return (
    <footer className="bg-night text-white/70 print:hidden">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 text-white"><Logo /><span className="font-serif text-xl">CoolGrid</span></div>
          <p className="mt-3 max-w-[42ch] text-sm">Tests whether a council&apos;s heatwave and flood arrangements still work when the power fails, a crossing closes or staff run short. Prototype for Climate Hack-tion 2026.</p>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-amber">Explore</p>
          <ul className="space-y-1.5 text-sm">
            {[["/continuity", "Continuity Lab"], ["/dashboard", "Planning map"], ["/investment", "Investment Gate"], ["/regional", "Greater Shepparton"], ["/validation", "Validation"], ["/methodology", "Method and limits"]].map(([h, l]) => (
              <li key={h}><Link href={h} className="text-white/70 no-underline hover:text-white">{l}</Link></li>
            ))}
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-amber">Data and disclosure</p>
          <p>ABS Census, SEIFA and boundaries; Vicmap planning overlays, features, roads and trees; Clean Energy Regulator installations. All CC BY 4.0. Basemap © OpenStreetMap contributors.</p>
          <p className="mt-3">Facility inputs, demand and costs are labelled illustrative. Built with substantial help from AI assistants (Claude) and reviewed by the team.</p>
        </div>
      </div>
    </footer>
  );
}
