import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/pg";

type AggRow = { userId: string; name: string; count: number };

function getRange(type: string, from?: string | null, to?: string | null, date?: string | null): { start: Date; end: Date; label: string } {
  const now = new Date();

  if (type === "custom" && from && to) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    return { start, end, label: `${fmt(start)} — ${fmt(end)}` };
  }

  if (type === "daily") {
    const base = date ? new Date(date) : now;
    const start = new Date(base);
    start.setHours(0, 0, 0, 0);
    const end = new Date(base);
    end.setHours(23, 59, 59, 999);
    const isToday = start.toDateString() === now.toDateString();
    const dateStr = base.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    return { start, end, label: `${isToday ? "Today" : "Date"} — ${dateStr}` };
  }

  if (type === "weekly") {
    const day = now.getDay();
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

async function aggregate(table: "leads" | "invoices" | "units", start: Date, end: Date): Promise<AggRow[]> {
  const rows = await query<{ user_id: string; name: string; count: string }>(
    `SELECT t.created_by AS user_id, COALESCE(u.name, 'Unknown') AS name, count(*) AS count
     FROM ${table} t LEFT JOIN users u ON u.id = t.created_by
     WHERE t.created_at >= $1 AND t.created_at <= $2
     GROUP BY t.created_by, u.name
     ORDER BY name ASC`,
    [start, end]
  );
  return rows.map(r => ({ userId: r.user_id, name: r.name, count: Number(r.count) }));
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["super_admin", "manager"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const type = req.nextUrl.searchParams.get("type") ?? "daily";
  if (!["daily", "weekly", "monthly", "custom"].includes(type))
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const from = req.nextUrl.searchParams.get("from");
  const to   = req.nextUrl.searchParams.get("to");
  const date = req.nextUrl.searchParams.get("date");

  if (type === "custom" && (!from || !to))
    return NextResponse.json({ error: "from and to dates required for custom range" }, { status: 400 });

  const { start, end, label } = getRange(type, from, to, date);

  const [leadRows, invoiceRows, unitRows] = await Promise.all([
    aggregate("leads", start, end),
    aggregate("invoices", start, end),
    aggregate("units", start, end),
  ]);

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
