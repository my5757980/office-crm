import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Lead from "@/models/Lead";
import Invoice from "@/models/Invoice";
import Unit from "@/models/Unit";
import mongoose from "mongoose";

function getRange(type: string, from?: string | null, to?: string | null, date?: string | null) {
  const now = new Date();

  if (type === "custom" && from && to) {
    const start = new Date(from); start.setHours(0, 0, 0, 0);
    const end   = new Date(to);   end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (type === "daily") {
    const base  = date ? new Date(date) : now;
    const start = new Date(base); start.setHours(0, 0, 0, 0);
    const end   = new Date(base); end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (type === "weekly") {
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(now); mon.setDate(now.getDate() + diffToMon); mon.setHours(0, 0, 0, 0);
    const fri = new Date(mon); fri.setDate(mon.getDate() + 4);         fri.setHours(23, 59, 59, 999);
    return { start: mon, end: fri };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["super_admin", "manager"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = req.nextUrl.searchParams.get("userId");
  const type   = req.nextUrl.searchParams.get("type") ?? "daily";
  const from   = req.nextUrl.searchParams.get("from");
  const to     = req.nextUrl.searchParams.get("to");
  const date   = req.nextUrl.searchParams.get("date");

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (!["daily", "weekly", "monthly", "custom"].includes(type))
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  await dbConnect();
  const { start, end } = getRange(type, from, to, date);

  let userOid: mongoose.Types.ObjectId;
  try { userOid = new mongoose.Types.ObjectId(userId); }
  catch { return NextResponse.json({ error: "Invalid userId" }, { status: 400 }); }

  const match = { createdBy: userOid, createdAt: { $gte: start, $lte: end } };

  const [leads, invoices, units] = await Promise.all([
    Lead.find(match).select("customerName phone createdAt status").sort({ createdAt: -1 }).lean(),
    Invoice.find(match).select("unit cnfPrice consignee createdAt").sort({ createdAt: -1 }).lean(),
    Unit.find(match).select("unit chassisNo color createdAt").sort({ createdAt: -1 }).lean(),
  ]);

  return NextResponse.json({ leads, invoices, units });
}
