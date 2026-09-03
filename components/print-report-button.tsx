"use client";

export function PrintReportButton() {
  return <button className="button" type="button" onClick={() => window.print()}>Drucken / als PDF sichern</button>;
}
