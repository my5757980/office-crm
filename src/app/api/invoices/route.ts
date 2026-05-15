import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Lead from "@/models/Lead";
import Invoice from "@/models/Invoice";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { invoiceRequestSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "user") {
    return NextResponse.json({ error: "Forbidden — only agents can raise invoice requests" }, { status: 403 });
  }

  await dbConnect();

  const body = await request.json();
  const parsed = invoiceRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { leadId, consignee, unit, year, salesperson, fuel, transmission, chassisNo, engineNo, color, m3Rate, exchangeRate, pushPrice, cnfPrice, advancePercent } = parsed.data;

  const lead = await Lead.findById(leadId);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.createdBy.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden — not your lead" }, { status: 403 });
  }
  if (lead.status === "closed") {
    return NextResponse.json({ error: "Cannot request invoice for a closed lead" }, { status: 400 });
  }

  const existing = await Invoice.findOne({ leadId, status: "pending" });
  if (existing) {
    return NextResponse.json({ error: "A pending invoice request already exists for this lead" }, { status: 409 });
  }

  const invoice = await Invoice.create({
    leadId,
    createdBy: session.user.id,
    consignee,
    unit,
    year,
    salesperson,
    fuel,
    transmission,
    chassisNo,
    engineNo,
    color,
    m3Rate,
    exchangeRate,
    pushPrice,
    cnfPrice,
    advancePercent,
  });

  await Lead.findByIdAndUpdate(leadId, { isCustomer: true });

  const supervisors = await User.find({ role: "super_admin" }, "_id");
  const notifications = supervisors.map((sup) => ({
    userId: sup._id,
    message: `New invoice request from ${session.user.name} for ${lead.customerName}`,
    type: "invoice_requested" as const,
    invoiceId: invoice._id,
  }));
  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }

  return NextResponse.json({ invoice }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();

  const isElevated = ["admin", "manager", "super_admin"].includes(session.user.role);
  const filter = isElevated ? {} : { createdBy: session.user.id };

  const invoices = await Invoice.find(filter)
    .populate("createdBy", "name email")
    .populate("leadId", "customerName")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ invoices });
}
