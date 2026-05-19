import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Lead from "@/models/Lead";
import Invoice from "@/models/Invoice";
import Unit from "@/models/Unit";

type AggRow = { userId: string; name: string; count: number };

function getRange(type: string): { start: Date; end: Date; label: string } {
  const now = new Date();

  if (type === "daily") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: `Today — ${now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` };
  }

  if (type === "weekly") {
    const day = now.getDay(); // 0=Sun,1=Mon,...
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    mon.setHours(0, 0, 0, 0);
    const fri = new Date(mon);
    fri.setDate(mon.getDate() + 4);
    fri.setHours(23, 59, 59, 999);
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    return { start: mon, end: fri, label: `This Week — ${fmt(mon)} to ${fmt(fri)}` };
  }

  // monthly
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const label = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  return { start, end, label };
}

async function aggregate(Model: typeof Lead | typeof Invoice | typeof Unit, start: Date, end: Date): Promise<AggRow[]> {
  const rows = await Model.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: "$createdBy", count: { $sum: 1 } } },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "u" } },
    { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
    { $project: { _id: 0, userId: { $toString: "$_id" }, name: { $ifNull: ["$u.name", "Unknown"] }, count: 1 } },
    { $sort: { name: 1 } },
  ]);
  return rows as AggRow[];
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["super_admin", "manager"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const type = req.nextUrl.searchParams.get("type") ?? "daily";
  if (!["daily", "weekly", "monthly"].includes(type))
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  await dbConnect();

  const { start, end, label } = getRange(type);

  const [leadRows, invoiceRows, unitRows] = await Promise.all([
    aggregate(Lead    as Parameters<typeof aggregate>[0], start, end),
    aggregate(Invoice as Parameters<typeof aggregate>[0], start, end),
    aggregate(Unit    as Parameters<typeof aggregate>[0], start, end),
  ]);

  // merge by userId
  const map = new Map<string, { name: string; leads: number; invoices: number; units: number }>();

  const ensure = (userId: string, name: string) => {
    if (!map.has(userId)) map.set(userId, { name, leads: 0, invoices: 0, units: 0 });
  };

  leadRows.forEach(r    => { ensure(r.userId, r.name); map.get(r.userId)!.leads    = r.count; });
  invoiceRows.forEach(r => { ensure(r.userId, r.name); map.get(r.userId)!.invoices = r.count; });
  unitRows.forEach(r    => { ensure(r.userId, r.name); map.get(r.userId)!.units    = r.count; });

  const agents = [...map.entries()]
    .map(([userId, v]) => ({ userId, ...v }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const totals = agents.reduce(
    (acc, a) => ({ leads: acc.leads + a.leads, invoices: acc.invoices + a.invoices, units: acc.units + a.units }),
    { leads: 0, invoices: 0, units: 0 }
  );

  return NextResponse.json({ period: { start, end, label }, agents, totals });
}
