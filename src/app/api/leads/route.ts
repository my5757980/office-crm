import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Lead from "@/models/Lead";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { leadSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const country = searchParams.get("country") || "";
  const port = searchParams.get("port") || "";
  const status = searchParams.get("status") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const isElevated = ["admin", "manager", "super_admin"].includes(session.user.role);
  const filter: Record<string, unknown> = isElevated
    ? {}
    : { createdBy: session.user.id };

  if (search) filter.customerName = { $regex: search, $options: "i" };
  if (country) filter.country = country;
  if (port) filter.port = port;
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) (filter.createdAt as Record<string, Date>).$gte = new Date(from);
    if (to) (filter.createdAt as Record<string, Date>).$lte = new Date(to);
  }

  const total = await Lead.countDocuments(filter);
  const leads = await Lead.find(filter)
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return NextResponse.json({ leads, total, page });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "user") {
    return NextResponse.json({ error: "Forbidden — only staff can create leads" }, { status: 403 });
  }

  await dbConnect();

  const body = await request.json();
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Duplicate phone check
  const existing = await Lead.findOne({ phone: parsed.data.phone }).populate("createdBy", "name").lean();
  if (existing) {
    const owner = (existing.createdBy as { name?: string } | null)?.name ?? "another agent";
    const date  = new Date(existing.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    // Notify all Supervisors
    const supervisors = await User.find({ role: "super_admin" }, "_id").lean();
    if (supervisors.length > 0) {
      await Notification.insertMany(supervisors.map((s) => ({
        userId:  s._id,
        message: `Duplicate lead attempt by ${session.user.name} — client already registered under ${owner} (Phone: ${parsed.data.phone})`,
        type:    "duplicate_lead",
        leadId:  existing._id,
      })));
    }

    return NextResponse.json({
      error: "duplicate",
      ownerName: owner,
      ownerDate: date,
      phone: parsed.data.phone,
    }, { status: 409 });
  }

  let lead;
  try {
    lead = await Lead.create({ ...parsed.data, createdBy: session.user.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Lead create error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ lead }, { status: 201 });
}
