import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Payment from "@/models/Payment";
import { paymentSchema } from "@/lib/validations";

const CAN_RECORD = ["manager", "super_admin"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_RECORD.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const body = await request.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const paymentData: Record<string, unknown> = {
    ...parsed.data,
    receivedDate: new Date(parsed.data.receivedDate),
    recordedBy: session.user.id,
  };
  if (parsed.data.receiptImage) {
    paymentData.receiptImage = {
      ...parsed.data.receiptImage,
      uploadedAt: new Date(),
    };
  }
  const payment = await Payment.create(paymentData);

  return NextResponse.json({ payment }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get("invoiceId");
  if (!invoiceId) return NextResponse.json({ error: "invoiceId required" }, { status: 400 });

  const payments = await Payment.find({ invoiceId })
    .populate("recordedBy", "name")
    .sort({ receivedDate: 1 })
    .lean();

  return NextResponse.json({ payments });
}
