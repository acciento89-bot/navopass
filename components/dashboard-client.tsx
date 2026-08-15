"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toggleFavoriteAction } from "@/app/actions/assets";
import type { Asset } from "@/lib/assets";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
}

function dueState(value: string | null) {
  if (!value) return null;
  const due = new Date(`${value}T23:59:59`).getTime();
  const now = Date.now();
  const days = Math.ceil((due - now) / 86400000);
  if (days < 0) return { label: "Überfällig", tone: "danger" };
  if (days <= 30) return { label: `${days} Tage`, tone: "warning" };
  return null;
}

export function DashboardClient({ assets }: { assets: Asset[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [visibility, setVisibility] = useState("ALL");
  const [sort, setSort] = useState("UPDATED");
  const [showArchived, setShowArchived] = useState(false);

  const categories = useMemo(() => [...new Set(assets.map((asset) => asset.category))].sort((a, b) => a.localeCompare(b, "de")), [assets]);
  const activeAssets = assets.filter((asset) => !asset.archived_at);
  const shared = activeAssets.filter((asset) => asset.visibility !== "PRIVATE").length;
  const favorites = activeAssets.filter((asset) => asset.favorite).length;
  const attention = activeAssets.filter((asset) => {
    const warranty = dueState(asset.warranty_until);
    const service = dueState(asset.next_service_date);
    return warranty?.tone === "danger" || warranty?.tone === "warning" || service?.tone === "danger" || service?.tone === "warning";
  }).length;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return assets
      .filter((asset) => (showArchived ? true : !asset.archived_at))
      .filter((asset) => category === "ALL" || asset.category === category)
      .filter((asset) => visibility === "ALL" || (visibility === "SHARED" ? asset.visibility !== "PRIVATE" : asset.visibility === visibility))
      .filter((asset) => {
        if (!needle) return true;
        return [asset.name, asset.category, asset.manufacturer, asset.model, asset.serial_number, asset.location]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      })
      .sort((a, b) => {
        if (sort === "NAME") return a.name.localeCompare(b.name, "de");
        if (sort === "WARRANTY") return (a.warranty_until || "9999-12-31").localeCompare(b.warranty_until || "9999-12-31");
        if (sort === "SERVICE") return (a.next_service_date || "9999-12-31").localeCompare(b.next_service_date || "9999-12-31");
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [assets, category, query, showArchived, sort, visibility]);

  return (
    <>
      <section className="dashboard-stats">
        <article><span>Aktive Pässe</span><b>{activeAssets.length}</b><small>{assets.length - activeAssets.length} archiviert</small></article>
        <article><span>Geteilt</span><b>{shared}</b><small>Per Link oder öffentlich</small></article>
        <article><span>Favoriten</span><b>{favorites}</b><small>Schnell griffbereit</small></article>
        <article className={attention ? "attention" : ""}><span>Demnächst fällig</span><b>{attention}</b><small>Garantie oder Wartung</small></article>
      </section>

      <section className="dashboard-tools">
        <div className="search-field"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pässe durchsuchen…" aria-label="Pässe durchsuchen" /></div>
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Kategorie filtern"><option value="ALL">Alle Kategorien</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={visibility} onChange={(event) => setVisibility(event.target.value)} aria-label="Sichtbarkeit filtern"><option value="ALL">Alle Freigaben</option><option value="PRIVATE">Privat</option><option value="SHARED">Geteilt</option><option value="PUBLIC">Öffentlich</option></select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sortierung"><option value="UPDATED">Zuletzt geändert</option><option value="NAME">Name A–Z</option><option value="SERVICE">Nächste Wartung</option><option value="WARRANTY">Garantieende</option></select>
        <label className="archive-toggle"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Archiv anzeigen</label>
      </section>

      {filtered.length === 0 ? (
        <section className="empty-state compact"><div className="empty-icon">NP</div><h2>Keine passenden Pässe.</h2><p>Ändere Suche oder Filter – oder lege einen neuen Objektpass an.</p><Link className="button" href="/app/assets/new">+ Neues Objekt</Link></section>
      ) : (
        <section className="asset-grid">
          {filtered.map((asset) => {
            const service = dueState(asset.next_service_date);
            const warranty = dueState(asset.warranty_until);
            const status = service || warranty;
            return (
              <article className={`asset-card ${asset.archived_at ? "archived" : ""}`} key={asset.id}>
                <div className="asset-card-top">
                  <span className="asset-category">{asset.category}</span>
                  <div className="asset-card-actions">
                    {asset.archived_at && <span className="status-chip neutral">Archiviert</span>}
                    <span className={`visibility ${asset.visibility.toLowerCase()}`}>{asset.visibility === "PRIVATE" ? "Privat" : asset.visibility === "PUBLIC" ? "Öffentlich" : "Per Link"}</span>
                    <form action={toggleFavoriteAction}><input type="hidden" name="assetId" value={asset.id} /><button className={`favorite-button ${asset.favorite ? "active" : ""}`} type="submit" aria-label={asset.favorite ? "Favorit entfernen" : "Als Favorit markieren"}>{asset.favorite ? "★" : "☆"}</button></form>
                  </div>
                </div>
                <Link href={`/app/assets/${asset.id}`} className="asset-card-link">
                  <div className="asset-avatar">{asset.name.slice(0, 2).toUpperCase()}</div>
                  <h2>{asset.name}</h2>
                  <p>{[asset.manufacturer, asset.model].filter(Boolean).join(" · ") || "Noch keine Produktdaten"}</p>
                  <div className="asset-card-info">
                    <div><span>Nächste Wartung</span><b>{formatDate(asset.next_service_date)}</b></div>
                    <div><span>Garantie</span><b>{formatDate(asset.warranty_until)}</b></div>
                  </div>
                  {status && <span className={`due-chip ${status.tone}`}>{status.label === "Überfällig" ? "Handlungsbedarf · Überfällig" : `Demnächst fällig · ${status.label}`}</span>}
                </Link>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
