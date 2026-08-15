import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await query("SELECT 1");
    return Response.json({ ok: true, service: "navopass" });
  } catch {
    return Response.json({ ok: false, service: "navopass" }, { status: 503 });
  }
}
