export default function Methodology() {
  return (
    <main className="wrap">
      <h1>Method and limits</h1>
      <h2>Score</h2>
      <p>Priority = (0.30 heat + 0.25 vulnerability + 0.20 building inefficiency + 0.15 grid stress − 0.10 existing resilience) ÷ 0.9, clamped to 0–100. The 0.9 divisor lets scores use the full 0–100 range, since the weights otherwise reach 0.9 at most.</p>
      <table>
        <thead><tr><th>Score</th><th>Category</th></tr></thead>
        <tbody>
          <tr><td>0–34</td><td>Electrification-ready</td></tr>
          <tr><td>35–59</td><td>Support required</td></tr>
          <tr><td>60–79</td><td>High priority: resilience package first</td></tr>
          <tr><td>80–100</td><td>Urgent resilience action</td></tr>
        </tbody>
      </table>
      <h2 style={{ marginTop: "1.5rem" }}>Data status</h2>
      <p><b>Illustrative:</b> every neighbourhood score, population, hub location and cost in this prototype. Boundaries are simple rectangles, not real suburb shapes.</p>
      <p><b>To replace with public data:</b> urban heat and canopy (DEECA / City of Melbourne), Census and SEIFA for vulnerability, building age proxies, Clean Energy Regulator postcode solar installs, council facility lists for hubs.</p>
      <p><b>Needs partners:</b> feeder-level grid capacity (distribution networks) and verified retrofit costs.</p>
      <h2>Validation plan</h2>
      <ul>
        <li>Council planners review the top 10 areas and say where they disagree.</li>
        <li>Sensitivity test: vary weights by ±20% and report how rankings change.</li>
        <li>Back-test against past heat-health or heatwave-impact data where available.</li>
        <li>Hub coverage: count vulnerable residents within walking distance before and after.</li>
      </ul>
      <p className="note">CoolGrid is a decision-support prototype, not a live electricity-network planning system.</p>
    </main>
  );
}
