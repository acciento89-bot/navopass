import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await query("SELECT 1");
    return Response.json({ ok: true, service: "navopass", version: "0.2" });
  } catch {
    return Response.json({ ok: false, service: "navopass", version: "0.2" }, { status: 503 });
  }
}
