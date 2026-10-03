import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { AREAS, FLOOD_AREAS } from "@/lib/planning-data";
import { cardLanguages, TEXT } from "@/lib/resident-text";

export const metadata = { title: "Resident cards · CoolGrid" };

// Index of the plain-language resident cards, one per study suburb.
export default function ResidentIndex() {
  const cards = AREAS.map((a) => {
    const top = (a.topLanguages.value ?? []).map((l) => l.name);
    return { sal: a.sal, name: a.name, lga: a.lga, top, langs: cardLanguages(top), flood: FLOOD_AREAS.find((f) => f.sal === a.sal)!.pctRiverine.value as number };
  });
  const translated = cards.filter((c) => c.langs.length > 1).length;

  return (
    <>
      <PageHeader art="resident" eyebrow="Resident cards" title="Plain-language advice for every suburb."
        stats={[{ value: cards.length, label: "suburbs" }, { value: translated, label: "with a translated card" }, { value: Object.keys(TEXT).length, label: "languages (English, Vietnamese, Arabic)" }]}>
        Each card turns the same public data into advice a resident can act on: staying cool, asking council what is open, flood-safe electrification.
        A translation is offered where the ABS Census shows that language among the suburb&apos;s top three home languages.
      </PageHeader>
      <main data-reveal className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.sal} href={`/resident/${c.sal}`} className="group rounded-2xl bg-white p-5 text-ink no-underline ring-1 ring-line transition hover:-translate-y-1 hover:shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{c.lga}</p>
              <p className="mt-1 font-serif text-2xl">{c.name} <span className="inline-block transition-transform group-hover:translate-x-1">→</span></p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.langs.map((l) => <span key={l} lang={l} className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-medium text-white">{TEXT[l].name}</span>)}
              </div>
              <p className="mt-3 text-sm text-muted">Top home languages: {c.top.join(", ")}</p>
              <p className="mt-1 text-sm text-muted">{c.flood}% of the area is river flood land</p>
            </Link>
          ))}
        </div>
        <p className="mt-8 rounded-xl border-l-4 border-amber bg-white px-4 py-3 text-sm ring-1 ring-line">
          Vietnamese and Arabic translations are drafts and need review by native speakers. Cards never name a facility as a place to go: availability is decided by council during each emergency.
        </p>
      </main>
    </>
  );
}
