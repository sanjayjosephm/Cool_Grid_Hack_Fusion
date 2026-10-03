import Link from "next/link";
import { notFound } from "next/navigation";
import ResidentCard, { type CardFacts } from "@/components/ResidentCard";
import { HUB_SPECS, NEIGHBOURHOODS } from "@/lib/data";
import { applyMeasures, floodLevel, NO_MEASURES, recommendedPackage } from "@/lib/model";
import type { Upgrade } from "@/lib/resident-text";

export const generateStaticParams = () => NEIGHBOURHOODS.map((n) => ({ id: n.id }));
export const dynamicParams = false;

export function generateMetadata({ params }: { params: { id: string } }) {
  const n = NEIGHBOURHOODS.find((x) => x.id === params.id);
  return { title: n ? `${n.name} resident card · CoolGrid` : "CoolGrid" };
}

// The same model that drives the planner view, translated into what a resident needs to know and do.
export default function ResidentPage({ params }: { params: { id: string } }) {
  const n = NEIGHBOURHOODS.find((x) => x.id === params.id);
  if (!n) notFound();
  const r = applyMeasures(n, NO_MEASURES);
  const pkg = recommendedPackage(n);
  const facts: CardFacts = {
    name: n.name,
    heat: r.category.key,
    hub: r.hub ? { site: HUB_SPECS[n.id].site, works: r.hub.status === "pass" } : null,
    flood: floodLevel(n).key,
    // Home-level upgrades only: network upgrades and new hubs are council decisions, not resident actions.
    upgrades: ["heatpump", ...(["insulation", "shading", "solar", "battery", "floodproof"] as const).filter((k) => pkg[k])] as Upgrade[],
  };

  return (
    <main className="mx-auto max-w-[720px] px-6 pb-16 pt-8">
      <Link href="/dashboard" className="mb-4 inline-block text-sm print:hidden">← Back to the planner map</Link>
      <ResidentCard f={facts} />
    </main>
  );
}
