export default function Methodology() {
  return (
    <main className="mx-auto max-w-[760px] px-6 pb-16 pt-10">
      <h1 className="mb-5 text-4xl">Method and limits</h1>
      <h2 className="mt-6 text-2xl">Score</h2>
      <p>Priority = (0.30 heat + 0.25 vulnerability + 0.20 building inefficiency + 0.15 grid stress − 0.10 existing resilience) ÷ 0.9, clamped to 0–100. The 0.9 divisor lets scores use the full 0–100 range, since the weights otherwise reach 0.9 at most.</p>
      <table className="w-full border-collapse text-sm">
        <thead><tr><th className="border-b border-line px-2 py-1.5 text-left">Score</th><th className="border-b border-line px-2 py-1.5 text-left">Category</th></tr></thead>
        <tbody>
          <tr><td className="border-b border-line px-2 py-1.5">0–34</td><td className="border-b border-line px-2 py-1.5">Electrification-ready</td></tr>
          <tr><td className="border-b border-line px-2 py-1.5">35–59</td><td className="border-b border-line px-2 py-1.5">Support required</td></tr>
          <tr><td className="border-b border-line px-2 py-1.5">60–79</td><td className="border-b border-line px-2 py-1.5">High priority: resilience package first</td></tr>
          <tr><td className="border-b border-line px-2 py-1.5">80–100</td><td className="border-b border-line px-2 py-1.5">Urgent resilience action</td></tr>
        </tbody>
      </table>
      <h2 className="mt-6 text-2xl">Data status</h2>
      <p className="my-4"><b>Illustrative:</b> every neighbourhood score, population, hub location and cost in this prototype. Boundaries are simple rectangles, not real suburb shapes.</p>
      <p className="my-4"><b>To replace with public data:</b> urban heat and canopy (DEECA / City of Melbourne), Census and SEIFA for vulnerability, building age proxies, Clean Energy Regulator postcode solar installs, council facility lists for hubs.</p>
      <p className="my-4"><b>Needs partners:</b> feeder-level grid capacity (distribution networks) and verified retrofit costs.</p>
      <h2 className="mt-6 text-2xl">Validation plan</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Council planners review the top 10 areas and say where they disagree.</li>
        <li>Sensitivity test: vary weights by ±20% and report how rankings change.</li>
        <li>Back-test against past heat-health or heatwave-impact data where available.</li>
        <li>Hub coverage: count vulnerable residents within walking distance before and after.</li>
      </ul>
      <p className="my-6 border-l-4 border-amber bg-white px-4 py-2 text-[0.92rem]">CoolGrid is a decision-support prototype, not a live electricity-network planning system.</p>
    </main>
  );
}
