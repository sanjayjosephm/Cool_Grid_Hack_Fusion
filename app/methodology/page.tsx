import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { INDICATORS, WEIGHTS } from "@/lib/area-context";
import { INVERTER_EFFICIENCY, OUTAGE_HOURS } from "@/lib/backup";
import { FLOOD_SHARE, HEAT_SHARE } from "@/lib/demo-review";

export const metadata = { title: "Method and limits · CoolGrid" };

const H2 = "mt-8 text-2xl";
const P = "my-3";

export default function Methodology() {
  return (
    <>
    <PageHeader art="method" eyebrow="Method and limits" title="How CoolGrid works, and what it does not claim.">From public data to a review brief, with every assumption labelled and every limit stated.</PageHeader>
    <main data-reveal className="mx-auto max-w-[760px] px-6 pb-16 pt-8">
      <p className={P}>
        CoolGrid helps a council emergency or relief planning officer check whether a service arrangement still works when heat,
        a power outage or flood-related access loss disrupts facilities, and what to verify or exercise next.
      </p>

      <h2 id="events" className={`${H2} scroll-mt-20`}>Events behind the scenarios</h2>
      <p className={P}>The three scenarios are built on failure modes Victoria has already experienced:</p>
      <ol className="my-3 list-decimal space-y-3 pl-6">
        <li id="ref-1" className="scroll-mt-20">
          <b>January 2009 heatwave.</b> Melbourne was above 43 °C for three consecutive days (28–30 January), peaking at 45.1 °C; in Victoria up to 500,000 homes and
          businesses were left without electricity, and a Victorian Department of Human Services report found the heatwave contributed to 374 deaths.{" "}
          <a href="https://knowledge.aidr.org.au/resources/health-heatwave-south-eastern-australia-2009/" target="_blank" rel="noreferrer">Australian Institute for Disaster Resilience, &ldquo;Health – south-eastern Australia heatwave&rdquo;</a>.
        </li>
        <li id="ref-2" className="scroll-mt-20">
          <b>14 October 2022 Maribyrnong River flood.</b> Significant flooding in the urban Maribyrnong catchment in Melbourne&apos;s inner west, including Maribyrnong and Footscray;
          an independent review led by Tony Pagone AM reported in October 2023.{" "}
          <a href="https://letstalk.melbournewater.com.au/maribyrnong-river-flood-review" target="_blank" rel="noreferrer">Melbourne Water, &ldquo;Maribyrnong River flood review&rdquo;</a>.
        </li>
        <li id="ref-3" className="scroll-mt-20">
          <b>15 October 2022 Goulburn River flood, Shepparton.</b> The Midland Highway (Mooroopna Causeway) between Mooroopna and Shepparton was closed on the evening of
          Saturday 15 October 2022, cutting the main river crossing between the two towns.{" "}
          <a href="https://www.countrynews.com.au/news/live-blog-october-15/" target="_blank" rel="noreferrer">Country News, live blog, 15 October 2022</a>; see also{" "}
          <a href="https://greatershepparton.vic.gov.au/assets/files/documents/emergencies/flood/M25_34365_Greater_Shepparton_Recovery_and_Resilience_Plan_-_Progress_Report_-_June_2025.pdf" target="_blank" rel="noreferrer">Greater Shepparton City Council, Recovery and Resilience Plan progress report (June 2025)</a>.
        </li>
      </ol>
      <p className={P}>These events motivate the scenarios; CoolGrid does not model or predict them.</p>

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
        Each trip from a community to a facility is the shortest route on the Vicmap road network (freeways to local streets), from the suburb
        centre to the facility. The trip depends on every road crossing of a riverine flood overlay along that route; in the flood scenario those
        crossings are closed. This is a planning approximation, not a travel-time model or evacuation advice. In flood-exposed suburbs, homes that
        electrify should have heat pumps, batteries and switchboards mounted above flood level.
      </p>

      <h2 className={H2}>Opening hours and planner inputs</h2>
      <p className={P}>
        A facility counts for cooling only if it is open for the whole heat window (12:00–18:00). Flood relief opens on activation, so ordinary
        hours do not apply. Planners can replace any facility input in the Continuity Lab; their values are labelled declared and carried into the review brief.
      </p>

      <h2 className={H2}>Allocation policy</h2>
      <p className={P}>
        By default the engine counts the most places possible. The fair-share policy instead uses the same facilities and first guarantees every
        reachable community the largest equal share of its places, then fills any remaining places. Communities no counted facility can reach are named.
      </p>

      <h2 className={H2}>Investment Gate</h2>
      <p className={P}>
        Upgrade packages (larger batteries, backed-up cooling, a larger inverter, longer opening hours) are applied as planner inputs and every affordable
        combination is run through the engine. Places gained come from the engine; costs are illustrative placeholders. A combination is marked worth
        checking if no cheaper-or-equal one does at least as well in every scenario. This shows which assessed quotes to request first, not value for money.
      </p>

      <h2 className={H2}>Regional review</h2>
      <p className={P}>
        The same pipeline and engine are applied to Greater Shepparton (Shepparton, Mooroopna, Kialla, Shepparton North). A first regional review mostly
        produces questions, because facility backup facts are not yet known.
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
        <li>Shared generators, water supply, indoor temperature and travel time are not yet modelled.</li>
        <li>Grid capacity is not included: no open, machine-readable distributor data was found for these suburbs.</li>
        <li>Small-scale energy figures are postcode-level and tree counts are a heat proxy, not temperatures; both are context only.</li>
        <li>No council has reviewed or endorsed these results; usefulness compared with current planning practice is untested.</li>
      </ul>
    </main>
    </>
  );
}
