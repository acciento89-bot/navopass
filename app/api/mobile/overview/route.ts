import { getCurrentUser } from "@/lib/auth";
import { ensureCustomerSchema } from "@/lib/customer-schema";
import { query } from "@/lib/db";
import { hasBusinessService } from "@/lib/entitlements";
import { listPendingInvitesForEmail, listUserWorkspaces, listWorkspaceMembers } from "@/lib/workspaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return response({ error: "UNAUTHENTICATED" }, 401);

  const workspaces = await listUserWorkspaces(user.id);
  const workspaceDetails = await Promise.all(workspaces.map(async (workspace) => ({
    ...workspace,
    members: await listWorkspaceMembers(workspace.id),
  })));
  const invites = await listPendingInvitesForEmail(user.email);

  let customers: unknown[] = [];
  if (user.account_type === "PROFESSIONAL") {
    await ensureCustomerSchema();
    customers = (await query(
      `SELECT c.id,c.name,c.contact_name,c.email,c.phone,c.street,c.postal_code,c.city,c.country,c.notes,
              count(a.id)::int AS asset_count,
              count(a.id) FILTER (WHERE a.next_service_date < current_date)::int AS overdue_count,
              count(a.id) FILTER (WHERE a.next_service_date >= current_date AND a.next_service_date <= current_date + 30)::int AS due_30_count
         FROM service_customers c
         LEFT JOIN assets a ON a.service_customer_id=c.id AND a.archived_at IS NULL
        WHERE c.user_id=$1
        GROUP BY c.id
        ORDER BY c.name`,
      [user.id]
    )).rows;
  }

  const jobs = (await query(
    `SELECT j.id,j.user_id AS owner_user_id,j.assigned_user_id,au.name AS assigned_name,j.title,j.scheduled_for,
            j.estimated_duration_minutes,j.notes,j.priority,j.status,j.completed_event_id,
            a.id AS asset_id,a.name AS asset_name,c.id AS customer_id,c.name AS customer_name
       FROM service_jobs j
       JOIN assets a ON a.id=j.asset_id
       LEFT JOIN users au ON au.id=j.assigned_user_id
       LEFT JOIN service_customers c ON c.id=j.customer_id
      WHERE j.user_id=$1 OR j.assigned_user_id=$1
      ORDER BY CASE j.status WHEN 'IN_PROGRESS' THEN 0 WHEN 'OPEN' THEN 1 WHEN 'DONE' THEN 2 ELSE 3 END,
               j.scheduled_for NULLS LAST,j.created_at DESC`,
    [user.id]
  )).rows;

  return response({
    workspaces: workspaceDetails,
    invites,
    customers,
    jobs,
    capabilities: {
      professional: user.account_type === "PROFESSIONAL",
      business: hasBusinessService(user),
    },
  });
}
