import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne, genId } from "@/lib/pg";
import { paymentSchema } from "@/lib/validations";
import { serializePayment } from "@/lib/serialize";

const CAN_RECORD = ["manager", "super_admin"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_RECORD.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const d = parsed.data;
  const row = await queryOne(
    `INSERT INTO payments (id, invoice_id, selling_price, amount_received, received_date, exchange_rate, yen_amount, recorded_by, receipt_image_data, receipt_image_filename, receipt_image_uploaded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      genId(), d.invoiceId, d.sellingPrice, d.amountReceived, new Date(d.receivedDate), d.exchangeRate ?? null, d.yenAmount ?? null, session.user.id,
      d.receiptImage?.data ?? null, d.receiptImage?.filename ?? null, d.receiptImage ? new Date() : null,
    ]
  );

  return NextResponse.json({ payment: row ? serializePayment(row) : null }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get("invoiceId");
  if (!invoiceId) return NextResponse.json({ error: "invoiceId required" }, { status: 400 });

  const rows = await query(
    `SELECT p.*, u.name AS recorded_by_name FROM payments p LEFT JOIN users u ON u.id = p.recorded_by WHERE p.invoice_id = $1 ORDER BY p.received_date ASC`,
    [invoiceId]
  );

  const payments = rows.map(serializePayment);
  return NextResponse.json({ payments });
}
