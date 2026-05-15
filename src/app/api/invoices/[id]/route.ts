import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";
import Notification from "@/models/Notification";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const { id } = await params;

  const invoice = await Invoice.findById(id)
    .populate("createdBy", "name email")
    .populate("approvedBy", "name")
    .populate("leadId", "customerName contactPerson country port")
    .lean();

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isElevated = ["admin", "manager", "super_admin"].includes(session.user.role);
  const isOwner = (invoice.createdBy as { _id: { toString(): string } })._id.toString() === session.user.id;

  if (!isElevated && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ invoice });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden — only Supervisor can perform this action" }, { status: 403 });
  }

  await dbConnect();
  const { id } = await params;

  const invoice = await Invoice.findById(id).populate("leadId", "customerName");
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { action, rejectionNote } = body as { action: string; rejectionNote?: string };

  if (action === "approve") {
    if (invoice.status !== "pending") {
      return NextResponse.json({ error: "Only pending invoices can be approved" }, { status: 400 });
    }
    invoice.status = "approved";
    invoice.approvedBy = session.user.id as unknown as typeof invoice.approvedBy;
    await invoice.save();
    const customerName = (invoice.leadId as unknown as { customerName: string })?.customerName ?? "";
    await Notification.create({
      userId: invoice.createdBy,
      message: `Your invoice for ${customerName} has been approved`,
      type: "invoice_approved",
      invoiceId: invoice._id,
    });
  } else if (action === "reject") {
    if (invoice.status !== "pending") {
      return NextResponse.json({ error: "Only pending invoices can be rejected" }, { status: 400 });
    }
    invoice.status = "rejected";
    invoice.rejectionNote = rejectionNote ?? "";
    await invoice.save();
    const customerName = (invoice.leadId as unknown as { customerName: string })?.customerName ?? "";
    await Notification.create({
      userId: invoice.createdBy,
      message: `Your invoice for ${customerName} has been rejected${rejectionNote ? `: ${rejectionNote}` : ""}`,
      type: "invoice_rejected",
      invoiceId: invoice._id,
    });
  } else if (action === "mark_sent") {
    if (invoice.status !== "approved") {
      return NextResponse.json({ error: "Only approved invoices can be marked as sent" }, { status: 400 });
    }
    invoice.status = "sent";
    await invoice.save();
    const customerName = (invoice.leadId as unknown as { customerName: string })?.customerName ?? "";
    await Notification.create({
      userId:    invoice.createdBy,
      message:   `Aapki invoice approve ho gayi aur client "${customerName}" ko bhej di gayi`,
      type:      "invoice_approved",
      invoiceId: invoice._id,
    });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ invoice });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["manager", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden — only Manager/Admin can delete invoices" }, { status: 403 });
  }

  await dbConnect();
  const { id } = await params;

  const invoice = await Invoice.findById(id);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await Invoice.findByIdAndDelete(id);

  return NextResponse.json({ success: true });
}
