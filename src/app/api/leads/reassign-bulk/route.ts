import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/pg";

export const runtime = "nodejs";

const CAN_REASSIGN = ["super_admin"];

/**
 * Bulk-reassign leads of a given country to a user.
 * Only reassigns leads currently owned by the Supervisor (i.e. freshly imported,
 * not-yet-assigned ones) so existing agents' leads are never moved.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_REASSIGN.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden — only Supervisor can reassign" }, { status: 403 });

  const { country, userId } = await request.json();
  if (!country || !userId)
    return NextResponse.json({ error: "country and userId are required" }, { status: 400 });

  // Only the supervisor's own (unassigned/imported) leads for this country
  const leads = await query<{ id: string }>(`SELECT id FROM leads WHERE country = $1 AND created_by = $2`, [country, session.user.id]);
  if (leads.length === 0)
    return NextResponse.json({ reassigned: 0, message: "No unassigned leads for this country" });

  const leadIds = leads.map(l => l.id);

  await query(`UPDATE leads SET created_by = $1 WHERE id = ANY($2)`, [userId, leadIds]);
  await query(`UPDATE invoices SET created_by = $1 WHERE lead_id = ANY($2)`, [userId, leadIds]);
  await query(
    `UPDATE units SET created_by = $1 WHERE invoice_id IN (SELECT id FROM invoices WHERE lead_id = ANY($2))`,
    [userId, leadIds]
  );

  return NextResponse.json({ reassigned: leadIds.length });
}
