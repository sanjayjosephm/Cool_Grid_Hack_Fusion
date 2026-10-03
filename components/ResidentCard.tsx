"use client";
import { useState } from "react";
import { TEXT, type Lang, type Upgrade } from "@/lib/resident-text";

export type CardFacts = {
  name: string;
  heat: "ready" | "support" | "high" | "urgent";
  hub: { site: string; works: boolean } | null;
  flood: "low" | "moderate" | "high";
  upgrades: Upgrade[];
};

const H = "mt-6 mb-2 text-xl";

export default function ResidentCard({ f }: { f: CardFacts }) {
  const [lang, setLang] = useState<Lang>("en");
  const t = TEXT[lang];
  const high = f.heat === "high" || f.heat === "urgent";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden" role="group" aria-label="Language">
        {(Object.keys(TEXT) as Lang[]).map((l) => (
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

        <h2 className={H}>{t.heatH}: <span style={{ color: high ? "#C8402F" : f.heat === "support" ? "#B07A10" : "#3E8E6A" }}>{t.levels[f.heat]}</span></h2>
        <p>{high ? t.heatHigh : f.heat === "support" ? t.heatMedium : t.heatLow}</p>

        <h2 className={H}>{t.hubH}</h2>
        <p>{f.hub ? (f.hub.works ? t.hubPass(f.hub.site) : t.hubUnverified(f.hub.site)) : t.hubNone}</p>

        {f.flood !== "low" && (<><h2 className={H}>{t.floodH}</h2><p>{f.flood === "high" ? t.floodHigh : t.floodModerate}</p></>)}

        <h2 className={H}>{t.pkgH}</h2>
        <ul className="list-disc space-y-1 ps-6">{f.upgrades.map((u) => <li key={u}>{t.upgrades[u]}</li>)}</ul>
        <p className="mt-3">{t.rebates}</p>

        <h2 className={H}>{t.tipsH}</h2>
        <ul className="list-disc space-y-1 ps-6">{t.tips.map((x) => <li key={x}>{x}</li>)}</ul>

        <p className="mt-8 border-t border-line pt-3 text-xs text-muted">{t.draft}</p>
      </article>
    </div>
  );
}
