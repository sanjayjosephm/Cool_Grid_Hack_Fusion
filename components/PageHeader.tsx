import type { ReactNode } from "react";
import HeaderArt, { type Art } from "./HeaderArt";

// Dark animated header band shared by the inner pages, matching the landing page.
export default function PageHeader({ eyebrow, title, children, stats, art }: {
  eyebrow: string; title: ReactNode; children?: ReactNode; stats?: { value: ReactNode; label: string }[]; art?: Art;
}) {
  return (
    <header className="heat-bg relative overflow-hidden text-white print:hidden">
      <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className={`relative mx-auto grid max-w-6xl items-center gap-8 px-6 py-12 md:py-16 ${art ? "lg:grid-cols-[1fr_340px]" : ""}`}>
        <div>
        <p className="fade-up mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-amber">{eyebrow}</p>
        <h1 className="fade-up max-w-[22ch] text-[clamp(2rem,4.5vw,3.2rem)] font-medium leading-[1.08] tracking-tight" style={{ animationDelay: "80ms" }}>{title}</h1>
        {children && <div className="fade-up mt-4 max-w-[64ch] text-white/75" style={{ animationDelay: "160ms" }}>{children}</div>}
        {stats && (
          <dl className="fade-up mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/15 pt-5" style={{ animationDelay: "240ms" }}>
            {stats.map((s) => <div key={s.label}><dd className="font-serif text-3xl">{s.value}</dd><dt className="mt-0.5 text-sm text-white/60">{s.label}</dt></div>)}
          </dl>
        )}
        </div>
        {art && <div className="fade-up hidden justify-center lg:flex" style={{ animationDelay: "200ms" }}><HeaderArt art={art} /></div>}
      </div>
    </header>
  );
}
