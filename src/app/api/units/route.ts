import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Unit from "@/models/Unit";
import { unitSchema } from "@/lib/validations";

const CAN_ADD = ["manager", "super_admin"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_ADD.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const body = await request.json();
  const parsed = unitSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await Unit.findOne({ invoiceId: parsed.data.invoiceId });
  if (existing)
    return NextResponse.json({ error: "Unit already exists for this invoice" }, { status: 409 });

  const unit = await Unit.create({ ...parsed.data, createdBy: session.user.id });
  return NextResponse.json({ unit }, { status: 201 });
}
