import { getCurrentUser } from "@/lib/auth";
import { canEdit, listUserWorkspaces } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const workspaces = (await listUserWorkspaces(user.id)).filter((workspace) => canEdit(workspace.role));
  return Response.json({ workspaces }, { headers: { "Cache-Control": "private, no-store" } });
}
