import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne, genId } from "@/lib/pg";
import { invoiceRequestSchema } from "@/lib/validations";
import { serializeInvoice } from "@/lib/serialize";
import { syncInvoiceToWooCommerce } from "@/lib/woocommerce";
import { ensureVehicleTable, normalizeVehicles, vehicleCounts, vehicleTotals, vehicleRecordset, VEHICLE_COLUMNS, VEHICLE_RECORD_TYPE } from "@/lib/invoice-vehicles";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "user") {
    return NextResponse.json({ error: "Forbidden — only agents can raise invoice requests" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = invoiceRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { leadId, consignee, unit, year, salesperson, fuel, transmission, chassisNo, engineNo, color, m3Rate, exchangeRate, pushPrice, cnfPrice, advancePercent } = parsed.data;

  // Several vehicles per invoice ("Add More"). A screen that still sends the
  // single vehicle fields gets exactly what it got before: one vehicle.
  const vehicles = normalizeVehicles(
    parsed.data.vehicles?.length
      ? parsed.data.vehicles
      : [{ unit, year, color, chassisNo, engineNo, transmission, fuel, pushPrice, cnfPrice }]
  );
  const first = vehicles[0];
  const totals = vehicleTotals(vehicles);

  const lead = await queryOne<{ created_by: string; status: string; customer_name: string }>(
    `SELECT created_by, status, customer_name FROM leads WHERE id = $1`,
    [leadId]
  );
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.created_by !== session.user.id) {
    return NextResponse.json({ error: "Forbidden — not your lead" }, { status: 403 });
  }
  if (lead.status === "closed") {
    return NextResponse.json({ error: "Cannot request invoice for a closed lead" }, { status: 400 });
  }

  const existing = await queryOne(`SELECT id FROM invoices WHERE lead_id = $1 AND status = 'pending'`, [leadId]);
  if (existing) {
    return NextResponse.json({ error: "A pending invoice request already exists for this lead" }, { status: 409 });
  }

  await ensureVehicleTable();

  const invoiceId = genId();
  // The invoice and all its vehicles go in as ONE statement: either everything
  // is saved or nothing is. The invoices row keeps vehicle 1 in its own
  // columns and the TOTAL push / CNF prices.
  const invoiceRow = await queryOne(
    `WITH inv AS (
       INSERT INTO invoices (id, lead_id, created_by, consignee_name, consignee_address, consignee_phone, consignee_email, consignee_country, consignee_port, unit, chassis_no, engine_no, color, year, salesperson, fuel, transmission, m3_rate, exchange_rate, push_price, cnf_price, advance_percent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) RETURNING *
     ),
     veh AS (
       INSERT INTO invoice_vehicles (${VEHICLE_COLUMNS})
       SELECT v.id, inv.id, v.position, v.unit, v.year, v.color, v.chassis_no, v.engine_no, v.transmission, v.fuel, v.push_price, v.cnf_price
       FROM inv, json_to_recordset($23::json) AS v(${VEHICLE_RECORD_TYPE})
     )
     SELECT * FROM inv`,
    // Pricing is optional for the agent: the columns are NOT NULL, so a blank
    // price is stored as 0 until the Supervisor fills it in (Edit on the invoice).
    [invoiceId, leadId, session.user.id, consignee.name, consignee.address ?? "", consignee.phone, consignee.email ?? "", consignee.country, consignee.port, first.unit, first.chassisNo, first.engineNo, first.color, first.year, salesperson ?? "", first.fuel, first.transmission, m3Rate ?? 0, exchangeRate ?? 0, totals.push, totals.cnf, advancePercent ?? 50, vehicleRecordset(vehicles)]
  );

  await query(`UPDATE leads SET is_customer = true WHERE id = $1`, [leadId]);

  // No WooCommerce order at $0: without a CNF price it is created when the
  // Supervisor sets the price (see the "edit" action in invoices/[id]).
  if (totals.cnf) {
    await syncInvoiceToWooCommerce(invoiceId);
  }

  const vehicleNote = vehicles.length > 1 ? ` (${vehicles.length} vehicles)` : "";
  const supervisors = await query<{ id: string }>(`SELECT id FROM users WHERE role = 'super_admin'`);
  for (const sup of supervisors) {
    await query(
      `INSERT INTO notifications (id, user_id, message, type, invoice_id) VALUES ($1, $2, $3, 'invoice_requested', $4)`,
      [genId(), sup.id, `New invoice request from ${session.user.name} for ${lead.customer_name}${vehicleNote}`, invoiceId]
    );
  }

  return NextResponse.json({ invoice: invoiceRow ? serializeInvoice(invoiceRow) : null }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isElevated = ["admin", "manager", "super_admin"].includes(session.user.role);
  const whereSql = isElevated ? "" : "WHERE i.created_by = $1";
  const params = isElevated ? [] : [session.user.id];

  const rows = await query(
    `SELECT i.id, i.lead_id, i.created_by, i.approved_by, i.consignee_name, i.consignee_address, i.consignee_phone, i.consignee_email, i.consignee_country, i.consignee_port,
            i.unit, i.chassis_no, i.engine_no, i.color, i.year, i.salesperson, i.fuel, i.transmission, i.m3_rate, i.exchange_rate, i.push_price, i.cnf_price,
            i.advance_percent, i.status, i.rejection_note, i.created_at, i.updated_at,
            u.name AS created_by_name, u.email AS created_by_email,
            l.customer_name AS lead_customer_name
     FROM invoices i
     LEFT JOIN users u ON u.id = i.created_by
     LEFT JOIN leads l ON l.id = i.lead_id
     ${whereSql}
     ORDER BY i.created_at DESC`,
    params
  );

  const counts = await vehicleCounts(rows.map((r) => String(r.id)));
  const invoices = rows.map((r) => {
    const inv = serializeInvoice(r);
    return counts.has(inv._id) ? { ...inv, vehicleCount: counts.get(inv._id) } : inv;
  });
  return NextResponse.json({ invoices });
}
