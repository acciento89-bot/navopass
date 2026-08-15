import QRCode from "qrcode";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const data = new URL(request.url).searchParams.get("data") ?? "";
  if (!data || data.length > 500) return new Response("Invalid QR data", { status: 400 });

  const png = await QRCode.toBuffer(data, {
    type: "png",
    width: 512,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  const body = Uint8Array.from(png);

  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
