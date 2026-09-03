import { getLocale } from "@/lib/i18n";

export default async function OfflinePage() {
  const locale = await getLocale();
  const tr = (de: string, en: string) => locale === "en" ? en : de;
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f7fbfd", color: "#17384b", fontFamily: "system-ui, sans-serif" }}>
      <section style={{ width: "min(560px, 100%)", background: "white", border: "1px solid #dbe8ef", borderRadius: 20, padding: 28, boxShadow: "0 18px 50px rgba(20,61,84,.08)" }}>
        <div style={{ fontWeight: 800, color: "#0b6e9d", marginBottom: 18 }}>NavoPass</div>
        <h1 style={{ margin: "0 0 12px", fontSize: 30 }}>{tr("Gerade keine Verbindung", "You’re offline")}</h1>
        <p style={{ margin: 0, lineHeight: 1.65, color: "#496778" }}>
          {tr("NavoPass speichert private Pässe und Dokumente bewusst nicht im Offline-Cache. Sobald deine Internetverbindung wieder da ist, kannst du sicher weiterarbeiten.", "NavoPass deliberately does not store private passes or documents in the offline cache. You can continue securely as soon as your internet connection is restored.")}
        </p>
      </section>
    </main>
  );
}
