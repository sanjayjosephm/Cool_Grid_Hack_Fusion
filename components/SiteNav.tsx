"use client";
// Site navigation: sticky glass bar, active-page highlight and a mobile menu. Height is 56 px (the planning map relies on it).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  ["/", "Overview"], ["/dashboard", "Planning map"], ["/continuity", "Continuity Lab"], ["/brief", "Review brief"],
  ["/investment", "Investment"], ["/regional", "Regional"], ["/validation", "Validation"], ["/methodology", "Method"],
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
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <nav className="sticky top-0 z-50 h-14 border-b border-line/70 bg-paper/80 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-full max-w-7xl items-center gap-2 px-4 md:px-6">
        <Link href="/" className="mr-auto flex items-center gap-2 text-ink no-underline">
          <Logo /><span className="font-serif text-xl font-semibold tracking-tight">CoolGrid</span>
        </Link>
        <div className="hidden items-center gap-1 lg:flex">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm no-underline transition-colors ${active(href) ? "bg-ink text-white" : "text-ink hover:bg-ink/5"}`}>
              {label}
            </Link>
          ))}
        </div>
        <button className="rounded-lg p-2 lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true"><path d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>
      {open && (
        <div className="border-b border-line bg-paper px-4 pb-3 lg:hidden">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={`block rounded-lg px-3 py-2 no-underline ${active(href) ? "bg-ink text-white" : "text-ink"}`}>{label}</Link>
          ))}
        </div>
      )}
    </nav>
  );
}
