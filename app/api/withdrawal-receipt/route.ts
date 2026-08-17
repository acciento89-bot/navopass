import { getWithdrawalByReceiptToken, withdrawalReceivedLabel } from "@/lib/withdrawal";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const receipt = await getWithdrawalByReceiptToken(token);
  if (!receipt) return new Response("Bestätigung nicht gefunden.", { status: 404 });

  const lines = [
    "NavoPass - Eingangsbestätigung der Widerrufserklärung",
    "",
    `Vorgangsnummer: ${receipt.id}`,
    `Eingang: ${withdrawalReceivedLabel(receipt.requested_at)}`,
    `Name: ${receipt.consumer_name}`,
    `E-Mail-Adresse: ${receipt.email}`,
    `Vertrag: ${receipt.contract_label}`,
    "Erklärung: Hiermit wird der bezeichnete Vertrag widerrufen.",
    "",
    `Bearbeitungsstatus: ${receipt.processing_note || "Die Widerrufserklärung ist eingegangen."}`,
    "",
    "Anbieter: Piotr Kaminski - Kamilunavo, Otto-Braun-Straße 14, 40595 Düsseldorf",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="navopass-widerrufsbestaetigung-${receipt.id.slice(0, 8)}.txt"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
