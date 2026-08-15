import QRCode from "qrcode";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const data = url.searchParams.get("data") ?? "";
  const download = url.searchParams.get("download") === "1";
  if (!data || data.length > 500) return new Response("Invalid QR data", { status: 400 });

  const png = await QRCode.toBuffer(data, {
    type: "png",
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  const body = Uint8Array.from(png);
  const headers: Record<string, string> = {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };
  if (download) headers["Content-Disposition"] = 'attachment; filename="navopass-qr.png"';

  return new Response(body, { headers });
}
