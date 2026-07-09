import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/pg";
import { serializePayment, serializeUnit } from "@/lib/serialize";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["manager", "admin", "super_admin"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Units may reference this payment (optional link) — clear it before deleting
  // so the FK constraint doesn't block the delete.
  await query(`UPDATE units SET payment_id = NULL WHERE payment_id = $1`, [id]);
  const payment = await queryOne(`DELETE FROM payments WHERE id = $1 RETURNING id`, [id]);
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const row = await queryOne<Record<string, unknown>>(
    `SELECT p.*, u.name AS recorded_by_name FROM payments p LEFT JOIN users u ON u.id = p.recorded_by WHERE p.id = $1`,
    [id]
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const unitRow = await queryOne(`SELECT * FROM units WHERE payment_id = $1`, [id]);

  return NextResponse.json({ payment: serializePayment(row), unit: unitRow ? serializeUnit(unitRow) : null });
}
