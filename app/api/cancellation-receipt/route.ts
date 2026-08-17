import {
  cancellationEndLabel,
  cancellationKindLabel,
  cancellationReceivedLabel,
  getCancellationByReceiptToken,
} from "@/lib/cancellation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const receipt = await getCancellationByReceiptToken(token);
  if (!receipt) return new Response("Bestätigung nicht gefunden.", { status: 404 });

  const lines = [
    "NavoPass - Empfangsbestätigung der Kündigungserklärung",
    "",
    `Vorgangsnummer: ${receipt.id}`,
    `Eingang: ${cancellationReceivedLabel(receipt.requested_at)}`,
    `E-Mail-Adresse: ${receipt.email}`,
    `Vertrag: ${receipt.contract_label}`,
    `Art der Kündigung: ${cancellationKindLabel(receipt.cancellation_kind)}`,
    `Gewünschter Beendigungszeitpunkt: ${cancellationEndLabel(receipt)}`,
    receipt.reason ? `Kündigungsgrund: ${receipt.reason}` : null,
    "",
    `Bearbeitungsstatus: ${receipt.processing_note || "Die Kündigungserklärung ist eingegangen."}`,
    "",
    "Anbieter: Piotr Kaminski - Kamilunavo, Otto-Braun-Straße 14, 40595 Düsseldorf",
  ].filter((line): line is string => line !== null);

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="navopass-kuendigungsbestaetigung-${receipt.id.slice(0, 8)}.txt"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
