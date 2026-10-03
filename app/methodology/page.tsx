import Link from "next/link";
import { INDICATORS, WEIGHTS } from "@/lib/area-context";
import { INVERTER_EFFICIENCY, OUTAGE_HOURS } from "@/lib/backup";
import { FLOOD_SHARE, HEAT_SHARE } from "@/lib/demo-review";

export const metadata = { title: "Method and limits · CoolGrid" };

const H2 = "mt-8 text-2xl";
const P = "my-3";

export default function Methodology() {
  return (
    <main className="mx-auto max-w-[760px] px-6 pb-16 pt-10">
      <h1 className="mb-3 text-4xl">Method and limits</h1>
      <p className={P}>
        CoolGrid helps a council emergency or relief planning officer check whether a service arrangement still works when heat,
        a power outage or flood-related access loss disrupts facilities, and what to verify or exercise next.
      </p>

      <h2 className={H2}>Data</h2>
      <p className={P}>Every value carries a label: <b>public</b> (official dataset), <b>declared</b> (entered by the planner), <b>illustrative</b> (a labelled placeholder) or <b>unknown</b> (missing; it blocks results and raises a question). Unknown values are never guessed.</p>
      <ul className="my-3 list-disc space-y-1 pl-6">
        <li><b>Public:</b> ABS Census 2021 and SEIFA 2021 by suburb; ABS suburb boundaries; Vicmap flood overlays (LSIO, Floodway, SBO), facility locations and main roads. All CC BY 4.0. See the <Link href="/validation">validation page</Link> for each source and its checks.</li>
        <li><b>Illustrative:</b> facility places, opening hours, crews, backup power, authorisation and suitability; community demand. These must be replaced with council records.</li>
      </ul>

      <h2 className={H2}>Continuity Lab</h2>
      <p className={P}>
        Three arrangements (existing central library; central library with a proposed backup upgrade; central library plus local facilities)
        are tested against three <b>separate</b> scenarios: heat, heat with a {OUTAGE_HOURS}-hour power outage, and a riverine flood that closes every
        main-road crossing inside a flood overlay. Scenario results are never added together.
      </p>
      <p className={P}>
        For each scenario and arrangement, the engine finds the most places that can be counted within the entered crew limit, without
        counting any facility&apos;s places or crews twice, and reports the gap for each community, the dependency causing it, and a question for its owner.
      </p>
      <p className={P}>
        <b>Demand</b> is an illustrative planning requirement, not a count of residents: heat places for {HEAT_SHARE * 100}% of residents aged 65+;
        flood relief places for {FLOOD_SHARE * 100}% of residents in the riverine flood-overlay share of each suburb.
      </p>

      <h2 className={H2}>Backup check</h2>
      <p className={P}>
        A facility counts in the outage scenario only if its cooling circuit is on the backed-up board, its inverter covers the compressor
        start-up surge plus other loads, and its usable battery energy (capacity minus reserve, after {Math.round((1 - INVERTER_EFFICIENCY) * 100)}% inverter losses)
        lasts the outage. No solar recharge is assumed. Any unknown input gives &ldquo;needs assessment&rdquo;. Passing shows electrical endurance only, not a safe indoor temperature.
      </p>

      <h2 className={H2}>Access and flood</h2>
      <p className={P}>
        A trip from a community to a facility depends on every flood-exposed crossing within 0.5 km of the straight line between the suburb
        centre and the facility. This is an approximation, not a routed path or evacuation advice. In flood-exposed suburbs, homes that
        electrify should have heat pumps, batteries and switchboards mounted above flood level.
      </p>

      <h2 className={H2}>Area context score</h2>
      <p className={P}>
        Background context for choosing where to review first, not a decision. Each indicator is scaled 0–100 across the study suburbs and weighted:
      </p>
      <ul className="my-3 list-disc space-y-1 pl-6">{INDICATORS.map((i) => <li key={i.key}>{i.label}: {Math.round(WEIGHTS[i.key] * 100)}%</li>)}</ul>
      <p className={P}>Changing each weight by ±20% is tested on the validation page.</p>

      <h2 className={H2}>Limits</h2>
      <ul className="my-3 list-disc space-y-1 pl-6">
        <li>Results are conditional on illustrative inputs; they do not certify that any facility is ready, open or safe.</li>
        <li>Opening hours, shared generators, water, indoor temperature and real road routing are not yet modelled.</li>
        <li>No council has reviewed or endorsed these results; usefulness compared with current planning practice is untested.</li>
      </ul>
    </main>
  );
}
