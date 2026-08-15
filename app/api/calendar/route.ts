import { getCurrentUser } from "@/lib/auth";
import { listAssets } from "@/lib/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function icsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function icsDate(value: string) {
  return value.replace(/-/g, "");
}

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.redirect(new URL("/login", request.url), 303);

  const assets = (await listAssets(user.id)).filter((asset) => !asset.archived_at);
  const appUrl = (process.env.APP_URL || "https://navopass.de").replace(/\/$/, "");
  const now = stamp();
  const events: string[] = [];

  for (const asset of assets) {
    const details = [asset.manufacturer, asset.model, asset.location].filter(Boolean).join(" · ");
    const passUrl = `${appUrl}/app/assets/${asset.id}`;

    if (asset.next_service_date) {
      events.push([
        "BEGIN:VEVENT",
        `UID:service-${asset.id}@navopass.de`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${icsDate(asset.next_service_date)}`,
        `SUMMARY:${icsText(`Wartung: ${asset.name}`)}`,
        `DESCRIPTION:${icsText(`${details ? `${details}\\n` : ""}Wartung in NavoPass. Intervall: ${asset.service_interval_months || 12} Monate.`)}`,
        `URL:${passUrl}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
      ].join("\r\n"));
    }

    if (asset.warranty_until) {
      events.push([
        "BEGIN:VEVENT",
        `UID:warranty-${asset.id}@navopass.de`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${icsDate(asset.warranty_until)}`,
        `SUMMARY:${icsText(`Garantie endet: ${asset.name}`)}`,
        `DESCRIPTION:${icsText(`${details ? `${details}\\n` : ""}Garantiefrist aus deinem NavoPass Objektpass.`)}`,
        `URL:${passUrl}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
      ].join("\r\n"));
    }
  }

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kamilunavo//NavoPass 0.3//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:NavoPass Fristen",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new Response(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="navopass-termine.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
