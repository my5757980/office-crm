import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/pg";
import { serializeLead, serializeMessage } from "@/lib/serialize";

type RouteContext = { params: Promise<{ id: string }> };

const CAN_VIEW_ALL     = ["admin", "manager", "super_admin"];
const CAN_EDIT_DETAILS  = ["super_admin", "manager"];
const CAN_CHANGE_STATUS = ["super_admin", "manager"];
const CAN_DELETE        = ["manager", "admin"];

async function checkViewAccess(leadId: string, userId: string, role: string) {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT l.*, u.name AS created_by_name, u.email AS created_by_email FROM leads l LEFT JOIN users u ON u.id = l.created_by WHERE l.id = $1`,
    [leadId]
  );
  if (!row) return { lead: null, allowed: false };

  const canViewAll = CAN_VIEW_ALL.includes(role);
  const isOwner    = row.created_by === userId;

  return { lead: serializeLead(row), allowed: canViewAll || isOwner };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { lead, allowed } = await checkViewAccess(id, session.user.id, session.user.role);

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messageRows = await query(`SELECT * FROM messages WHERE lead_id = $1 ORDER BY created_at ASC`, [id]);
  const messages = messageRows.map(serializeMessage);

  return NextResponse.json({ lead, messages });
}

const DETAIL_FIELD_TO_COLUMN: Record<string, string> = {
  customerName: "customer_name",
  contactPerson: "contact_person",
  address: "address",
  phone: "phone",
  email: "email",
  country: "country",
  countryCode: "country_code",
  port: "port",
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await queryOne(`SELECT id FROM leads WHERE id = $1`, [id]);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const setClauses: string[] = [];
  const setParams: unknown[] = [];
  const setP = (v: unknown) => { setParams.push(v); return `$${setParams.length}`; };

  // Status change — sirf Admin/Manager
  if ("status" in body) {
    if (!CAN_CHANGE_STATUS.includes(session.user.role))
      return NextResponse.json({ error: "Forbidden — only Admin/Manager can change status" }, { status: 403 });
    setClauses.push(`status = ${setP(body.status)}`);
  }

  // Reassign — sirf Supervisor
  if ("reassignTo" in body) {
    if (!CAN_EDIT_DETAILS.includes(session.user.role))
      return NextResponse.json({ error: "Forbidden — only Supervisor can reassign" }, { status: 403 });

    const newAgentId = body.reassignTo;
    setClauses.push(`created_by = ${setP(newAgentId)}`);

    // Cascade: invoices aur units bhi same agent ko do
    await query(`UPDATE invoices SET created_by = $1 WHERE lead_id = $2`, [newAgentId, id]);
    await query(
      `UPDATE units SET created_by = $1 WHERE invoice_id IN (SELECT id FROM invoices WHERE lead_id = $2)`,
      [newAgentId, id]
    );
    await query(`UPDATE notifications SET read = true WHERE lead_id = $1 AND type = 'duplicate_lead'`, [id]);
  }

  // Detail edit — sirf Supervisor
  const detailFields = Object.keys(DETAIL_FIELD_TO_COLUMN);
  const hasDetailFields = detailFields.some(f => f in body);
  if (hasDetailFields) {
    if (!CAN_EDIT_DETAILS.includes(session.user.role))
      return NextResponse.json({ error: "Forbidden — only Supervisor can edit lead details" }, { status: 403 });
    for (const key of detailFields) {
      if (key in body) setClauses.push(`${DETAIL_FIELD_TO_COLUMN[key]} = ${setP(body[key])}`);
    }
  }

  if (setClauses.length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  setClauses.push(`updated_at = now()`);
  const updatedRow = await queryOne<Record<string, unknown>>(
    `UPDATE leads SET ${setClauses.join(", ")} WHERE id = ${setP(id)} RETURNING *`,
    setParams
  );
  return NextResponse.json({ lead: updatedRow ? serializeLead(updatedRow) : null });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!CAN_DELETE.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden — only Admin/Manager can delete" }, { status: 403 });
  }

  const { id } = await params;
  const lead = await queryOne(`SELECT id FROM leads WHERE id = $1`, [id]);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await query(`DELETE FROM messages WHERE lead_id = $1`, [id]);
    await query(`DELETE FROM leads WHERE id = $1`, [id]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Could not delete lead: ${msg}` }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
