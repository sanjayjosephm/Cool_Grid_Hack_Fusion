"use client";
// A form that updates the page in place: on any change (or submit) it rewrites the query string with a soft
// navigation, so the server re-renders only the results; no full reload and no jump to the top.
import { usePathname, useRouter } from "next/navigation";
import { useTransition, type FormEvent, type ReactNode } from "react";

export default function AutoForm({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();

  const apply = (form: HTMLFormElement) => {
    const query = new URLSearchParams();
    new FormData(form).forEach((v, k) => { if (typeof v === "string" && v !== "") query.set(k, v); });
    start(() => router.replace(`${path}?${query}`, { scroll: false }));
  };

  return (
    <form className={className} aria-busy={pending}
      onChange={(e) => apply(e.currentTarget)}
      onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); apply(e.currentTarget); }}>
      {children}
      <span role="status" className={`self-center text-sm text-muted transition-opacity ${pending ? "opacity-100" : "opacity-0"}`}>Updating…</span>
    </form>
  );
}
