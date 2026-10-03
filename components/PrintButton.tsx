"use client";

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()}
      className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold hover:bg-paper print:hidden">
      Print brief
    </button>
  );
}
