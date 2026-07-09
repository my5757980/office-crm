import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne, genId } from "@/lib/pg";
import { unitSchema } from "@/lib/validations";
import { serializeUnit } from "@/lib/serialize";

const CAN_ADD = ["manager", "super_admin"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_ADD.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = unitSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await queryOne(`SELECT id FROM units WHERE invoice_id = $1`, [parsed.data.invoiceId]);
  if (existing)
    return NextResponse.json({ error: "Unit already exists for this invoice" }, { status: 409 });

  const d = parsed.data;
  const row = await queryOne(
    `INSERT INTO units (id, invoice_id, make, car_model, year, color, chassis, engine_cc, drive, fuel, mileage, transmission, steering, doors, seats, location, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
    [genId(), d.invoiceId, d.make, d.carModel, d.year, d.color, d.chassis, d.engineCC, d.drive, d.fuel, d.mileage, d.transmission, d.steering, d.doors, d.seats, d.location, session.user.id]
  );

  return NextResponse.json({ unit: row ? serializeUnit(row) : null }, { status: 201 });
}
