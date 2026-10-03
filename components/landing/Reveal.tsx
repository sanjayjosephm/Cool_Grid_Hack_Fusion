"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Adds .in to every .reveal element, and every direct child of a [data-reveal] container, as it scrolls into view
// (see globals.css). Mounted once in the root layout; re-runs on each page navigation.
export default function Reveal() {
  const path = usePathname();
  useEffect(() => {
    const els = document.querySelectorAll(".reveal, [data-reveal] > *");
    if (!("IntersectionObserver" in window)) return els.forEach((el) => el.classList.add("in"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.08 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [path]);
  return null;
}
