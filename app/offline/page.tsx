export default function OfflinePage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f7fbfd", color: "#17384b", fontFamily: "system-ui, sans-serif" }}>
      <section style={{ width: "min(560px, 100%)", background: "white", border: "1px solid #dbe8ef", borderRadius: 20, padding: 28, boxShadow: "0 18px 50px rgba(20,61,84,.08)" }}>
        <div style={{ fontWeight: 800, color: "#0b6e9d", marginBottom: 18 }}>NavoPass</div>
        <h1 style={{ margin: "0 0 12px", fontSize: 30 }}>Gerade keine Verbindung</h1>
        <p style={{ margin: 0, lineHeight: 1.65, color: "#496778" }}>
          NavoPass speichert private Pässe und Dokumente bewusst nicht im Offline-Cache. Sobald deine Internetverbindung wieder da ist, kannst du sicher weiterarbeiten.
        </p>
      </section>
    </main>
  );
}
