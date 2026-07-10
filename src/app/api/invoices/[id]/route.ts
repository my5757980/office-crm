import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne, genId } from "@/lib/pg";
import { serializeInvoice } from "@/lib/serialize";

type RouteContext = { params: Promise<{ id: string }> };

const INVOICE_DETAIL_SELECT = `
  SELECT i.id, i.lead_id, i.created_by, i.approved_by, i.consignee_name, i.consignee_address, i.consignee_phone, i.consignee_country, i.consignee_port,
         i.unit, i.chassis_no, i.engine_no, i.color, i.year, i.salesperson, i.fuel, i.transmission, i.m3_rate, i.exchange_rate, i.push_price, i.cnf_price,
         i.advance_percent, i.status, i.rejection_note, i.created_at, i.updated_at,
         i.uploaded_pdf_filename, i.uploaded_pdf_uploaded_at, (i.uploaded_pdf_data IS NOT NULL) AS has_uploaded_pdf,
         u.name AS created_by_name, u.email AS created_by_email,
         a.name AS approved_by_name,
         l.customer_name AS lead_customer_name, l.contact_person AS lead_contact_person, l.country AS lead_country, l.port AS lead_port
  FROM invoices i
  LEFT JOIN users u ON u.id = i.created_by
  LEFT JOIN users a ON a.id = i.approved_by
  LEFT JOIN leads l ON l.id = i.lead_id
  WHERE i.id = $1
`;

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const row = await queryOne<Record<string, unknown>>(INVOICE_DETAIL_SELECT, [id]);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isElevated = ["admin", "manager", "super_admin"].includes(session.user.role);
  const isOwner = row.created_by === session.user.id;

  if (!isElevated && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ invoice: serializeInvoice(row) });
}

const EDIT_FIELD_TO_COLUMN: Record<string, string> = {
  unit: "unit",
  chassisNo: "chassis_no",
  engineNo: "engine_no",
  color: "color",
  year: "year",
  salesperson: "salesperson",
  fuel: "fuel",
  transmission: "transmission",
  consigneeName: "consignee_name",
  consigneePhone: "consignee_phone",
  consigneeAddress: "consignee_address",
  consigneeCountry: "consignee_country",
  consigneePort: "consignee_port",
};
const EDIT_NUMBER_FIELDS = ["m3Rate", "exchangeRate", "pushPrice", "cnfPrice", "advancePercent"];
const NUMBER_FIELD_TO_COLUMN: Record<string, string> = {
  m3Rate: "m3_rate", exchangeRate: "exchange_rate", pushPrice: "push_price", cnfPrice: "cnf_price", advancePercent: "advance_percent",
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden — only Supervisor can perform this action" }, { status: 403 });
  }

  const { id } = await params;

  const invoice = await queryOne<{ id: string; created_by: string; status: string; lead_customer_name: string }>(
    `SELECT i.id, i.created_by, i.status, l.customer_name AS lead_customer_name FROM invoices i LEFT JOIN leads l ON l.id = i.lead_id WHERE i.id = $1`,
    [id]
  );
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { action, rejectionNote } = body as { action: string; rejectionNote?: string };
  const customerName = invoice.lead_customer_name ?? "";

  if (action === "edit") {
    const setClauses: string[] = [];
    const setParams: unknown[] = [];
    const setP = (v: unknown) => { setParams.push(v); return `$${setParams.length}`; };

    for (const [field, column] of Object.entries(EDIT_FIELD_TO_COLUMN)) {
      if (body[field] !== undefined) setClauses.push(`${column} = ${setP(String(body[field]).trim())}`);
    }
    for (const field of EDIT_NUMBER_FIELDS) {
      if (body[field] !== undefined) setClauses.push(`${NUMBER_FIELD_TO_COLUMN[field]} = ${setP(Number(body[field]))}`);
    }

    if (setClauses.length > 0) {
      setClauses.push(`updated_at = now()`);
      await query(`UPDATE invoices SET ${setClauses.join(", ")} WHERE id = ${setP(id)}`, setParams);
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    if (invoice.status !== "pending") {
      return NextResponse.json({ error: "Only pending invoices can be approved" }, { status: 400 });
    }
    await query(`UPDATE invoices SET status = 'approved', approved_by = $1, updated_at = now() WHERE id = $2`, [session.user.id, id]);
    await query(
      `INSERT INTO notifications (id, user_id, message, type, invoice_id) VALUES ($1, $2, $3, 'invoice_approved', $4)`,
      [genId(), invoice.created_by, `Your invoice for ${customerName} has been approved.`, id]
    );
  } else if (action === "reject") {
    if (invoice.status !== "pending") {
      return NextResponse.json({ error: "Only pending invoices can be rejected" }, { status: 400 });
    }
    await query(`UPDATE invoices SET status = 'rejected', rejection_note = $1, updated_at = now() WHERE id = $2`, [rejectionNote ?? "", id]);
    await query(
      `INSERT INTO notifications (id, user_id, message, type, invoice_id) VALUES ($1, $2, $3, 'invoice_rejected', $4)`,
      [genId(), invoice.created_by, `Your invoice for ${customerName} has been rejected${rejectionNote ? `. Reason: ${rejectionNote}` : "."}`, id]
    );
  } else if (action === "mark_sent") {
    if (invoice.status !== "approved") {
      return NextResponse.json({ error: "Only approved invoices can be marked as sent" }, { status: 400 });
    }
    await query(`UPDATE invoices SET status = 'sent', updated_at = now() WHERE id = $1`, [id]);
    await query(
      `INSERT INTO notifications (id, user_id, message, type, invoice_id) VALUES ($1, $2, $3, 'invoice_approved', $4)`,
      [genId(), invoice.created_by, `Your invoice for ${customerName} has been approved and sent to the client.`, id]
    );
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const updatedRow = await queryOne<Record<string, unknown>>(INVOICE_DETAIL_SELECT, [id]);
  return NextResponse.json({ invoice: updatedRow ? serializeInvoice(updatedRow) : null });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["manager", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden — only Manager/Admin can delete invoices" }, { status: 403 });
  }

  const { id } = await params;

  const invoice = await queryOne(`SELECT id FROM invoices WHERE id = $1`, [id]);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    // Notifications referencing this invoice are just transient alerts —
    // clear them so the FK constraint doesn't block the delete.
    await query(`DELETE FROM notifications WHERE invoice_id = $1`, [id]);
    await query(`DELETE FROM invoices WHERE id = $1`, [id]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("foreign key constraint")) {
      return NextResponse.json(
        { error: "Cannot delete — this invoice still has payments or units recorded against it. Remove those first." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: `Could not delete invoice: ${msg}` }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
