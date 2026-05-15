import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Payment from "@/models/Payment";
import Unit from "@/models/Unit";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const { id } = await params;

  const payment = await Payment.findById(id).populate("recordedBy", "name").lean();
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const unit = await Unit.findOne({ paymentId: id }).lean();

  return NextResponse.json({ payment, unit });
}
