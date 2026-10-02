import Link from "next/link";
import { NEIGHBOURHOODS } from "@/lib/data";
import { applyMeasures, NO_MEASURES } from "@/lib/model";

export default function Home() {
  const scored = NEIGHBOURHOODS.map((n) => ({ n, s: applyMeasures(n, NO_MEASURES).score }));
  const high = scored.filter((x) => x.s >= 60);
  const residents = high.reduce((s, x) => s + x.n.population, 0);
  const homes = high.reduce((s, x) => s + x.n.homes, 0);
  return (
    <main className="wrap hero">
      <h1>Electrify homes without making heatwaves more dangerous.</h1>
      <p>
        Moving homes off gas is essential for COP31's building-energy goal. But more households will rely on the grid, and
        the grid is under most strain on the hottest days. The January 2009 Melbourne heatwave overloaded the power network
        and was linked to an estimated 374 excess deaths. CoolGrid helps council officers decide where to electrify first
        and what to pair it with: insulation, shading, solar, batteries or a backup-powered cooling hub.
      </p>
      <div className="stats">
        <div><b>{NEIGHBOURHOODS.length}</b>areas assessed</div>
        <div><b>{residents.toLocaleString()}</b>residents in high-priority areas</div>
        <div><b>{homes.toLocaleString()}</b>homes needing a resilience package</div>
      </div>
      <Link className="btn" href="/dashboard">Explore the resilience map</Link>
      <p className="note">Prototype figures use illustrative sample data, not measured values or a live electricity-network model. See Method and limits.</p>
    </main>
  );
}
