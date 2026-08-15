"use client";

import { useState } from "react";

export function ShareActions({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title, text: `${title} · NavoPass`, url });
      return;
    }
    await copyLink();
  }

  return (
    <div className="share-actions">
      <button className="button small" type="button" onClick={share}>Teilen</button>
      <button className="button ghost small" type="button" onClick={copyLink}>{copied ? "Kopiert ✓" : "Link kopieren"}</button>
      <button className="button ghost small" type="button" onClick={() => window.print()}>Drucken</button>
    </div>
  );
}
