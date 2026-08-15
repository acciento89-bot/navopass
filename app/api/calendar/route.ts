import { getCurrentUser } from "@/lib/auth";
import { listAssets } from "@/lib/assets";
import { addDaysDateOnly, dateOnlyCompact } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function icsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function foldLine(line: string) {
  if (Buffer.byteLength(line, "utf8") <= 70) return line;
  const chunks: string[] = [];
  let current = "";
  for (const char of line) {
    if (current && Buffer.byteLength(current + char, "utf8") > 70) {
      chunks.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) chunks.push(current);
  return chunks.join("\r\n ");
}

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function eventBlock(args: { uid: string; date: string; summary: string; description: string; url: string; now: string }) {
  const start = dateOnlyCompact(args.date);
  const nextDay = addDaysDateOnly(args.date, 1);
  const end = dateOnlyCompact(nextDay);
  if (!start || !end) return null;

  return [
    "BEGIN:VEVENT",
    `UID:${args.uid}`,
    `DTSTAMP:${args.now}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${icsText(args.summary)}`,
    `DESCRIPTION:${icsText(args.description)}`,
    `URL;VALUE=URI:${args.url}`,
    "STATUS:CONFIRMED",
    "TRANSP:TRANSPARENT",
    "SEQUENCE:0",
    "END:VEVENT",
  ].map(foldLine).join("\r\n");
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
      const block = eventBlock({
        uid: `service-${asset.id}@navopass.de`,
        date: asset.next_service_date,
        summary: `Wartung: ${asset.name}`,
        description: [details, `Wartung in NavoPass. Intervall: ${asset.service_interval_months || 12} Monate.`].filter(Boolean).join("\n"),
        url: passUrl,
        now,
      });
      if (block) events.push(block);
    }

    if (asset.warranty_until) {
      const block = eventBlock({
        uid: `warranty-${asset.id}@navopass.de`,
        date: asset.warranty_until,
        summary: `Garantie endet: ${asset.name}`,
        description: [details, "Garantiefrist aus deinem NavoPass Objektpass."].filter(Boolean).join("\n"),
        url: passUrl,
        now,
      });
      if (block) events.push(block);
    }
  }

  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kamilunavo//NavoPass 0.4.1//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:NavoPass Termine",
    "X-WR-TIMEZONE:Europe/Berlin",
  ].map(foldLine);

  const calendar = [...header, ...events, "END:VCALENDAR", ""].join("\r\n");

  return new Response(calendar, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8; method=PUBLISH",
      "Content-Disposition": 'inline; filename="navopass-termine.ics"',
      "Content-Language": "de",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
