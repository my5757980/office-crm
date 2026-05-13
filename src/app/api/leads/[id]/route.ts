import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Lead from "@/models/Lead";
import Message from "@/models/Message";
import Notification from "@/models/Notification";

type RouteContext = { params: Promise<{ id: string }> };

const CAN_VIEW_ALL     = ["admin", "manager", "super_admin"];
const CAN_EDIT_DETAILS = ["super_admin"];
const CAN_CHANGE_STATUS = ["admin", "manager"];
const CAN_DELETE       = ["admin", "manager"];

async function checkViewAccess(leadId: string, userId: string, role: string) {
  const lead = await Lead.findById(leadId);
  if (!lead) return { lead: null, allowed: false };

  const canViewAll = CAN_VIEW_ALL.includes(role);
  const isOwner    = lead.createdBy.toString() === userId;

  return { lead, allowed: canViewAll || isOwner };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const { id } = await params;
  const { lead, allowed } = await checkViewAccess(id, session.user.id, session.user.role);

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await Message.find({ leadId: id }).sort({ createdAt: 1 }).lean();

  return NextResponse.json({ lead, messages });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const { id } = await params;
  const lead = await Lead.findById(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  // Status change — sirf Admin/Manager
  if ("status" in body) {
    if (!CAN_CHANGE_STATUS.includes(session.user.role))
      return NextResponse.json({ error: "Forbidden — only Admin/Manager can change status" }, { status: 403 });
    updates.status = body.status;
  }

  // Reassign — sirf Supervisor
  if ("reassignTo" in body) {
    if (!CAN_EDIT_DETAILS.includes(session.user.role))
      return NextResponse.json({ error: "Forbidden — only Supervisor can reassign" }, { status: 403 });
    // Same owner ya different — dono case mein notification clear karo
    updates.createdBy = body.reassignTo;
    await Notification.updateMany(
      { leadId: id, type: "duplicate_lead" },
      { $set: { read: true } }
    );
  }

  // Detail edit — sirf Supervisor
  const detailFields = ["customerName", "contactPerson", "address", "phone", "email", "country", "countryCode", "port"];
  const hasDetailFields = detailFields.some(f => f in body);
  if (hasDetailFields) {
    if (!CAN_EDIT_DETAILS.includes(session.user.role))
      return NextResponse.json({ error: "Forbidden — only Supervisor can edit lead details" }, { status: 403 });
    for (const key of detailFields) {
      if (key in body) updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const updated = await Lead.findByIdAndUpdate(id, updates, { new: true });
  return NextResponse.json({ lead: updated });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!CAN_DELETE.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden — only Admin/Manager can delete" }, { status: 403 });
  }

  await dbConnect();
  const { id } = await params;
  const lead = await Lead.findById(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await Lead.findByIdAndDelete(id);
  await Message.deleteMany({ leadId: id });

  return NextResponse.json({ success: true });
}
