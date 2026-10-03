import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ResidentCard, { type CardFacts } from "@/components/ResidentCard";
import { AREAS, FLOOD_AREAS } from "@/lib/planning-data";
import { cardLanguages } from "@/lib/resident-text";

// Route parameter is the ABS suburb (SAL) code, e.g. /resident/20021 for Albion.
export const generateStaticParams = () => AREAS.map((a) => ({ id: a.sal }));
export const dynamicParams = false;

export function generateMetadata({ params }: { params: { id: string } }) {
  const a = AREAS.find((x) => x.sal === params.id);
  return { title: a ? `${a.name} resident card · CoolGrid` : "CoolGrid" };
}

export default function ResidentPage({ params }: { params: { id: string } }) {
  const area = AREAS.find((x) => x.sal === params.id);
  const flood = FLOOD_AREAS.find((x) => x.sal === params.id);
  if (!area || !flood) notFound();
  const topLanguages = (area.topLanguages.value ?? []).map((l) => l.name);
  const facts: CardFacts = {
    name: area.name,
    langs: cardLanguages(topLanguages),
    riverinePct: flood.pctRiverine.value as number,
    stormwaterPct: flood.pctStormwater.value as number,
    topLanguages,
  };

  return (
    <>
    <PageHeader art="resident" eyebrow="Resident card" title={<>Staying safe in heat and floods: {area.name}</>}
      stats={[{ value: (area.population.value ?? 0).toLocaleString("en-AU"), label: "residents" }, { value: `${facts.riverinePct}%`, label: "of the area is river flood land" }, { value: facts.langs.length, label: facts.langs.length === 1 ? "language" : "languages on this card" }]}>
      Plain-language advice for residents, from public flood maps and Census data. Choose a language below, or print the card for a library or community centre.
    </PageHeader>
    <main data-reveal className="mx-auto max-w-[720px] px-6 pb-16 pt-8">
      <Link href="/resident" className="mb-4 inline-block text-sm print:hidden">← All resident cards</Link>
      <ResidentCard f={facts} />
    </main>
    </>
  );
}
