import Link from "next/link";
import { INVERTER_EFFICIENCY, OUTAGE_HOURS } from "@/lib/hub";
import { BUILDING_TARGET, END_USE, HEAT_PUMP_COP, UPTAKE } from "@/lib/model";

export default function Methodology() {
  return (
    <main className="mx-auto max-w-[760px] px-6 pb-16 pt-10">
      <h1 className="mb-5 text-4xl">Method and limits</h1>
      <h2 className="mt-6 text-2xl">Score</h2>
      <p>Priority = (0.30 heat + 0.25 vulnerability + 0.20 building inefficiency + 0.15 grid stress − 0.10 existing resilience) ÷ 0.9, clamped to 0–100. The 0.9 divisor (the sum of the positive weights) lets scores use the full 0–100 range.</p>
      <table className="w-full border-collapse text-sm">
        <thead><tr><th className="border-b border-line px-2 py-1.5 text-left">Score</th><th className="border-b border-line px-2 py-1.5 text-left">Category</th></tr></thead>
        <tbody>
          <tr><td className="border-b border-line px-2 py-1.5">0–34</td><td className="border-b border-line px-2 py-1.5">Electrification-ready</td></tr>
          <tr><td className="border-b border-line px-2 py-1.5">35–59</td><td className="border-b border-line px-2 py-1.5">Support required</td></tr>
          <tr><td className="border-b border-line px-2 py-1.5">60–79</td><td className="border-b border-line px-2 py-1.5">High priority: resilience package first</td></tr>
          <tr><td className="border-b border-line px-2 py-1.5">80–100</td><td className="border-b border-line px-2 py-1.5">Urgent resilience action</td></tr>
        </tbody>
      </table>
      <h2 className="mt-6 text-2xl">Cooling-hub backup check</h2>
      <p className="my-4">A hub only counts as protecting residents if its backup can run the cooling through a {OUTAGE_HOURS}-hour blackout: the air-conditioning must be on the backed-up circuit, the inverter must cover the compressor start-up surge plus other loads, and usable battery energy (capacity minus reserve, after {Math.round((1 - INVERTER_EFFICIENCY) * 100)}% inverter losses) must last the outage. No solar recharge is assumed. Any unknown input gives &ldquo;needs assessment&rdquo;, never a pass. Passing shows electrical endurance only, not a safe indoor temperature.</p>
      <h2 className="mt-6 text-2xl">Energy saving</h2>
      <p className="my-4">Final-energy saving for one upgraded home versus the same home on gas. Illustrative end-use split: heating {END_USE.heating * 100}%, hot water {END_USE.hotWater * 100}%, cooling {END_USE.cooling * 100}%, other {END_USE.other * 100}%. Heat pumps are assumed to deliver {HEAT_PUMP_COP} units of heat per unit of electricity. Insulation cuts heating and cooling by up to 35%, scaled by building inefficiency; shading cuts cooling by 30%. Solar and batteries change energy supply, not use, so they are excluded. The area figure multiplies by {UPTAKE * 100}% uptake and is compared with the COP31 goal of a {BUILDING_TARGET}% cut in building-sector energy use by 2035.</p>
      <h2 className="mt-6 text-2xl">Flood exposure</h2>
      <p className="my-4">Floods and heatwaves rarely happen at the same time, so flood exposure does not change the heat priority score. It changes how the package is installed: in high-exposure areas (50+), heat pumps, batteries and switchboards must be mounted above flood level, and hub sites are flagged for an equipment-height and access check. Current flood values are illustrative; replace them with the share of homes inside Melbourne Water flood extents or the Land Subject to Inundation Overlay.</p>
      <h2 className="mt-6 text-2xl">Recommended package and resident card</h2>
      <p className="my-4">The recommended package is a rule-based starting point from each area&apos;s main drivers (for example building inefficiency 60+ adds insulation, high flood exposure adds raised equipment), not an optimum. The resident card turns the same results into plain-language advice in English, Vietnamese and Arabic; the translations are drafts that need native-speaker review.</p>
      <h2 className="mt-6 text-2xl">Data status</h2>
      <p className="my-4"><b>Illustrative:</b> every neighbourhood score, population, hub location and cost in this prototype.</p>
      <p className="my-4"><b>Real:</b> suburb boundaries from the ABS Suburbs and Localities (ASGS 2021, simplified), © Australian Bureau of Statistics, CC BY 4.0. Basemap © OpenStreetMap contributors via OpenFreeMap.</p>
      <p className="my-4"><b>To replace with public data:</b> urban heat and canopy (DEECA / City of Melbourne), Census and SEIFA for vulnerability, building age proxies, Clean Energy Regulator postcode solar installs, council facility lists for hubs.</p>
      <p className="my-4"><b>Needs partners:</b> feeder-level grid capacity (distribution networks) and verified retrofit costs.</p>
      <h2 className="mt-6 text-2xl">Validation</h2>
      <p className="my-4"><b>Done:</b> weight sensitivity (each weight ±20%) and hand-checked backup-check cases. <Link href="/validation">See the validation results</Link>.</p>
      <p className="my-2"><b>Still to do:</b></p>
      <ul className="list-disc space-y-1 pl-6">
        <li>Council planners review the top 10 areas and say where they disagree.</li>
        <li>Back-test against past heat-health or heatwave-impact data where available.</li>
        <li>Hub coverage: count vulnerable residents within walking distance before and after.</li>
      </ul>
      <p className="my-6 border-l-4 border-amber bg-white px-4 py-2 text-[0.92rem]">CoolGrid is a decision-support prototype, not a live electricity-network planning system.</p>
    </main>
  );
}
