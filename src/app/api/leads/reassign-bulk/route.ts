import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Lead from "@/models/Lead";
import Invoice from "@/models/Invoice";
import Unit from "@/models/Unit";

export const runtime = "nodejs";

const CAN_REASSIGN = ["super_admin"];

/**
 * Bulk-reassign leads of a given country to a user.
 * Only reassigns leads currently owned by the Supervisor (i.e. freshly imported,
 * not-yet-assigned ones) so existing agents' leads are never moved.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_REASSIGN.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden — only Supervisor can reassign" }, { status: 403 });

  const { country, userId } = await request.json();
  if (!country || !userId)
    return NextResponse.json({ error: "country and userId are required" }, { status: 400 });

  await dbConnect();

  // Only the supervisor's own (unassigned/imported) leads for this country
  const leads = await Lead.find({ country, createdBy: session.user.id }).select("_id").lean();
  if (leads.length === 0)
    return NextResponse.json({ reassigned: 0, message: "No unassigned leads for this country" });

  const leadIds = leads.map(l => l._id);
  const invoices = await Invoice.find({ leadId: { $in: leadIds } }).select("_id").lean();
  const invoiceIds = invoices.map(i => i._id);

  await Promise.all([
    Lead.updateMany({ _id: { $in: leadIds } },              { $set: { createdBy: userId } }),
    Invoice.updateMany({ leadId: { $in: leadIds } },        { $set: { createdBy: userId } }),
    Unit.updateMany({ invoiceId: { $in: invoiceIds } },     { $set: { createdBy: userId } }),
  ]);

  return NextResponse.json({ reassigned: leadIds.length });
}
