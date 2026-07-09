import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/pg";
import { serializeLead, serializeInvoice, serializeUnit } from "@/lib/serialize";

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

  if (!/^[0-9a-f]{24}$/i.test(userId))
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });

  const { start, end } = getRange(type, from, to, date);

  const [leadRows, invoiceRows, unitRows] = await Promise.all([
    query(`SELECT id, customer_name, phone, created_at, status FROM leads WHERE created_by = $1 AND created_at >= $2 AND created_at <= $3 ORDER BY created_at DESC`, [userId, start, end]),
    query(`SELECT * FROM invoices WHERE created_by = $1 AND created_at >= $2 AND created_at <= $3 ORDER BY created_at DESC`, [userId, start, end]),
    query(`SELECT * FROM units WHERE created_by = $1 AND created_at >= $2 AND created_at <= $3 ORDER BY created_at DESC`, [userId, start, end]),
  ]);

  const leads = leadRows.map(serializeLead);
  const invoices = invoiceRows.map(serializeInvoice);
  const units = unitRows.map(serializeUnit);

  return NextResponse.json({ leads, invoices, units });
}
