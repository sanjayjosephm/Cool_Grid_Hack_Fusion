"use client";
// Site navigation: dark glass bar with a sliding highlight, "More" menu, scroll progress and a full-screen mobile menu.
// Height stays 56 px (the planning map relies on it).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const MAIN = [["/", "Overview"], ["/dashboard", "Planning map"], ["/continuity", "Continuity Lab"], ["/brief", "Review brief"], ["/investment", "Investment"]] as const;
const MORE = [
  ["/regional", "Regional review", "Greater Shepparton, same engine"],
  ["/resident", "Resident cards", "Plain language, Vietnamese and Arabic"],
  ["/validation", "Validation", "Every check, live"],
  ["/methodology", "Method and limits", "Sources, assumptions, limits"],
] as const;

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#E2562F" /><stop offset="100%" stopColor="#2B6CB0" /></linearGradient></defs>
      <rect width="32" height="32" rx="8" fill="url(#lg)" />
      <path d="M8 11h16M8 16h16M8 21h16M11 8v16M16 8v16M21 8v16" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" />
      <circle cx="16" cy="16" r="4.5" fill="#fff" />
      <circle cx="16" cy="16" r="2" fill="#E2562F" />
    </svg>
  );
}

export default function SiteNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const bar = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const moreActive = MORE.some(([h]) => isActive(h));

  // Slide the highlight to the hovered link, else the active one (or "More" when a More page is open).
  // Positions are measured against the bar itself (not offsetParent, which differs for the nested "More" button) and
  // re-measured when web fonts finish loading or the bar resizes, so the highlight always matches the text.
  const key = hover ?? MAIN.find(([h]) => isActive(h))?.[0] ?? (moreActive ? "more" : null);
  useLayoutEffect(() => {
    const measure = () => {
      const root = bar.current, el = key ? root?.querySelector<HTMLElement>(`[data-key="${key}"]`) : null;
      if (!root || !el) return setPill(null);
      const r = root.getBoundingClientRect(), e = el.getBoundingClientRect();
      setPill({ left: e.left - r.left, width: e.width });
    };
    measure();
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    if (bar.current) ro.observe(bar.current);
    return () => ro.disconnect();
  }, [key]);

  useEffect(() => {
    const onScroll = () => { const max = document.documentElement.scrollHeight - innerHeight; setProgress(max > 0 ? scrollY / max : 0); };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, [path]);

  useEffect(() => { setOpen(false); setMore(false); }, [path]);
  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) { if (e.key === "Escape") { setMore(false); setOpen(false); } return; }
      if (!moreRef.current?.contains(e.target as Node)) setMore(false);
    };
    addEventListener("mousedown", close); addEventListener("keydown", close);
    return () => { removeEventListener("mousedown", close); removeEventListener("keydown", close); };
  }, []);

  return (
    <nav className="sticky top-0 z-50 h-14 bg-night/85 text-white backdrop-blur-xl backdrop-saturate-150 print:hidden">
      {/* Animated glow line and scroll progress along the bottom edge */}
      <div className="nav-glow absolute inset-x-0 bottom-0 h-px" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-heat via-amber to-[#7FB2DD] transition-[width] duration-150" style={{ width: `${progress * 100}%` }} aria-hidden="true" />

      <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-4 md:px-6">
        <Link href="/" className="group mr-auto flex items-center gap-2 text-white no-underline">
          <span className="transition-transform duration-300 group-hover:rotate-[8deg] group-hover:scale-110"><Logo /></span>
          <span className="font-serif text-xl font-semibold tracking-tight">CoolGrid</span>
          <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber ring-1 ring-white/15 sm:inline">COP31</span>
        </Link>

        <div ref={bar} className="relative hidden items-center lg:flex" onMouseLeave={() => setHover(null)}>
          {pill && <span className="absolute top-1/2 h-8 -translate-y-1/2 rounded-full bg-white/[0.12] ring-1 ring-white/15 transition-all duration-300 ease-out" style={{ left: pill.left, width: pill.width }} aria-hidden="true" />}
          {MAIN.map(([href, label]) => (
            <Link key={href} href={href} data-key={href} aria-current={isActive(href) ? "page" : undefined} onMouseEnter={() => setHover(href)}
              className={`relative z-[1] rounded-full px-3.5 py-1.5 text-sm no-underline transition-colors ${isActive(href) ? "text-white" : "text-white/65 hover:text-white"}`}>
              {label}
              {isActive(href) && <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber" aria-hidden="true" />}
            </Link>
          ))}
          <div ref={moreRef} className="relative">
            <button data-key="more" onMouseEnter={() => setHover("more")} onClick={() => setMore((m) => !m)} aria-expanded={more} aria-haspopup="menu"
              className={`relative z-[1] flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm transition-colors ${moreActive || more ? "text-white" : "text-white/65 hover:text-white"}`}>
              More
              <svg viewBox="0 0 12 12" className={`h-3 w-3 transition-transform ${more ? "rotate-180" : ""}`} aria-hidden="true"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
            </button>
            {more && (
              <div role="menu" className="nav-drop absolute right-0 top-11 w-72 overflow-hidden rounded-2xl bg-night/95 p-2 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl">
                {MORE.map(([href, label, desc]) => (
                  <Link key={href} role="menuitem" href={href} className={`block rounded-xl px-3 py-2.5 no-underline transition-colors ${isActive(href) ? "bg-white/10" : "hover:bg-white/[0.07]"}`}>
                    <span className="block text-sm font-semibold text-white">{label}</span>
                    <span className="block text-xs text-white/55">{desc}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* The CTA opens the Continuity Lab, so hovering it moves the highlight there rather than back to the current page. */}
        <Link href="/continuity?arrangement=existing&crews=3" onMouseEnter={() => setHover("/continuity")} onMouseLeave={() => setHover(null)}
          className="nav-cta ml-2 hidden rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-ink no-underline transition hover:-translate-y-px md:inline-block">
          Open the Lab →
        </Link>

        <button className="relative z-[60] rounded-lg p-2 lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true"><path d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>

      {/* Full-screen mobile menu with staggered links */}
      {open && (
        <div className="heat-bg fixed inset-0 top-14 z-50 overflow-y-auto px-6 py-8 lg:hidden">
          {[...MAIN.map(([h, l]) => [h, l, ""] as const), ...MORE].map(([href, label, desc], i) => (
            <Link key={href} href={href} className="nav-item block border-b border-white/10 py-4 text-white no-underline" style={{ animationDelay: `${i * 45}ms` }}>
              <span className={`font-serif text-2xl ${isActive(href) ? "text-amber" : ""}`}>{label}</span>
              {desc && <span className="block text-sm text-white/55">{desc}</span>}
            </Link>
          ))}
          <Link href="/continuity?arrangement=existing&crews=3" className="nav-item mt-8 inline-block rounded-full bg-white px-6 py-3 font-semibold text-ink no-underline" style={{ animationDelay: "420ms" }}>Open the Continuity Lab →</Link>
        </div>
      )}
    </nav>
  );
}
