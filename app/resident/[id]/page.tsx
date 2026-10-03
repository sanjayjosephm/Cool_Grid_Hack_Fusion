import Link from "next/link";
import { notFound } from "next/navigation";
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
    <main className="mx-auto max-w-[720px] px-6 pb-16 pt-8">
      <Link href="/dashboard" className="mb-4 inline-block text-sm print:hidden">← Back to the planning map</Link>
      <ResidentCard f={facts} />
    </main>
  );
}
