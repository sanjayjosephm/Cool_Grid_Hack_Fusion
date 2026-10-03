"use client";
import { useState } from "react";
import { TEXT, type Lang } from "@/lib/resident-text";

export type CardFacts = {
  name: string;
  langs: Lang[]; // English first, then translations matching the suburb's Census top languages
  riverinePct: number;
  stormwaterPct: number;
  topLanguages: string[];
};

const H = "mt-6 mb-2 text-xl";

export default function ResidentCard({ f }: { f: CardFacts }) {
  const [lang, setLang] = useState<Lang>("en");
  const t = TEXT[lang];
  const flooded = f.riverinePct > 0 || f.stormwaterPct > 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden" role="group" aria-label="Language">
        {f.langs.map((l) => (
          <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} lang={l}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${lang === l ? "bg-ink text-white" : "bg-white ring-1 ring-line hover:bg-paper"}`}>
            {TEXT[l].name}
          </button>
        ))}
        <button onClick={() => window.print()} className="ml-auto rounded-full px-4 py-1.5 text-sm font-medium ring-1 ring-line hover:bg-paper">{t.print}</button>
      </div>

      <article lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className="rounded-2xl bg-white p-7 text-[1.05rem] leading-relaxed ring-1 ring-line">
        <h1 className="mb-3 text-3xl">{t.title(f.name)}</h1>
        <p className="text-muted">{t.intro}</p>

        <h2 className={H}>{t.hotH}</h2>
        <ul className="list-disc space-y-1 ps-6">{t.hot.map((x) => <li key={x}>{x}</li>)}</ul>

        <h2 className={H}>{t.whereH}</h2>
        <p>{t.where}</p>

        <h2 className={H}>{t.floodH}</h2>
        <p>{f.riverinePct > 0 ? t.floodBoth(f.riverinePct, f.stormwaterPct) : f.stormwaterPct > 0 ? t.floodStorm(f.stormwaterPct) : t.floodNone}</p>
        {flooded && <p className="mt-2">{t.equipment}</p>}

        <h2 className={H}>{t.switchH}</h2>
        <ul className="list-disc space-y-1 ps-6">{t.switchItems.map((x) => <li key={x}>{x}</li>)}</ul>
        <p className="mt-3">{t.rebates}</p>
        <p className="mt-3 font-semibold">{t.emergency}</p>

        <p className="mt-8 border-t border-line pt-3 text-xs text-muted">{t.draft}</p>
      </article>
      {f.langs.length === 1 && (
        <p className="mt-3 text-xs text-muted print:hidden">Top home languages here (ABS Census 2021): {f.topLanguages.join(", ")}. Translations into these languages are not yet available.</p>
      )}
    </div>
  );
}
