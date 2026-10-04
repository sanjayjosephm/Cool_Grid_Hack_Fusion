// Fixed, slowly drifting background behind every page: three soft heat/flood colour glows over a faint grid.
// Pure CSS (transform animations only), so it costs almost nothing to render; static with reduced motion.
export default function MovingBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden" aria-hidden="true">
      <div className="orb orb-heat" />
      <div className="orb orb-amber" />
      <div className="orb orb-blue" />
      <div className="bg-grid absolute inset-0" />
    </div>
  );
}
