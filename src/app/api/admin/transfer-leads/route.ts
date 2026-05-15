import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Lead from "@/models/Lead";
import Invoice from "@/models/Invoice";
import Unit from "@/models/Unit";
import mongoose from "mongoose";

const CAN_MANAGE = ["admin", "manager"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !CAN_MANAGE.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const body = await request.json().catch(() => ({}));
  const { fromUserId, toUserId } = body;

  if (!fromUserId || !toUserId)
    return NextResponse.json({ error: "fromUserId and toUserId are required" }, { status: 400 });
  if (fromUserId === toUserId)
    return NextResponse.json({ error: "Cannot transfer to the same agent" }, { status: 400 });
  if (!mongoose.Types.ObjectId.isValid(fromUserId) || !mongoose.Types.ObjectId.isValid(toUserId))
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });

  const [fromUser, toUser] = await Promise.all([
    User.findById(fromUserId),
    User.findById(toUserId),
  ]);

  if (!fromUser || fromUser.role !== "user")
    return NextResponse.json({ error: "Source user must be an agent" }, { status: 400 });
  if (!toUser || toUser.role !== "user" || !toUser.isActive)
    return NextResponse.json({ error: "Target agent not found or inactive" }, { status: 400 });

  const from = new mongoose.Types.ObjectId(fromUserId);
  const to   = new mongoose.Types.ObjectId(toUserId);

  const [leadsRes, dupeRes, invoicesRes, unitsRes] = await Promise.all([
    Lead.updateMany({ createdBy: from }, { $set: { createdBy: to } }),
    Lead.updateMany({ duplicateAttemptBy: from }, { $set: { duplicateAttemptBy: to } }),
    Invoice.updateMany({ createdBy: from }, { $set: { createdBy: to } }),
    Unit.updateMany({ createdBy: from }, { $set: { createdBy: to } }),
  ]);

  return NextResponse.json({
    ok: true,
    from: fromUser.name,
    to: toUser.name,
    transferred: {
      leads:    leadsRes.modifiedCount,
      invoices: invoicesRes.modifiedCount,
      units:    unitsRes.modifiedCount,
      duplicateAttempts: dupeRes.modifiedCount,
    },
  });
}
