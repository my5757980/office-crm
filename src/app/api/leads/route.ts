import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne, genId } from "@/lib/pg";
import { leadSchema } from "@/lib/validations";
import { serializeLead } from "@/lib/serialize";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const where: string[] = [];
  const params: unknown[] = [];
  const p = (v: unknown) => { params.push(v); return `$${params.length}`; };

  if (!isElevated) where.push(`l.created_by = ${p(session.user.id)}`);
  if (search) where.push(`(l.customer_name ILIKE ${p(`%${search}%`)} OR l.contact_person ILIKE ${p(`%${search}%`)} OR l.phone ILIKE ${p(`%${search}%`)})`);
  if (country) where.push(`l.country = ${p(country)}`);
  if (port) where.push(`l.port = ${p(port)}`);
  if (status) where.push(`l.status = ${p(status)}`);
  if (from) where.push(`l.created_at >= ${p(new Date(from))}`);
  if (to) where.push(`l.created_at <= ${p(new Date(to))}`);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = await queryOne<{ count: string }>(`SELECT count(*) FROM leads l ${whereSql}`, params);
  const total = Number(totalRow?.count ?? 0);

  const rows = await query(
    `SELECT l.*, u.name AS created_by_name, u.email AS created_by_email
     FROM leads l LEFT JOIN users u ON u.id = l.created_by
     ${whereSql}
     ORDER BY l.created_at DESC
     LIMIT ${p(limit)} OFFSET ${p((page - 1) * limit)}`,
    params
  );

  const leads = rows.map(serializeLead);
  return NextResponse.json({ leads, total, page });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "user") {
    return NextResponse.json({ error: "Forbidden — only staff can create leads" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Duplicate phone check
  const existing = await queryOne<Record<string, unknown>>(
    `SELECT l.*, u.name AS created_by_name FROM leads l LEFT JOIN users u ON u.id = l.created_by WHERE l.phone = $1`,
    [parsed.data.phone]
  );
  if (existing) {
    const owner = (existing.created_by_name as string) || "another agent";
    const date  = new Date(existing.created_at as string).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    // Mark the existing lead as having a duplicate attempt
    await query(`UPDATE leads SET duplicate_attempt_by = $1 WHERE id = $2`, [session.user.id, existing.id]);

    // Notify all Supervisors
    const supervisors = await query<{ id: string }>(`SELECT id FROM users WHERE role = 'super_admin'`);
    for (const s of supervisors) {
      await query(
        `INSERT INTO notifications (id, user_id, message, type, lead_id) VALUES ($1, $2, $3, 'duplicate_lead', $4)`,
        [genId(), s.id, `Duplicate lead attempt by ${session.user.name} — client already registered under ${owner} (Phone: ${parsed.data.phone})`, existing.id]
      );
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
    const id = genId();
    const row = await queryOne(
      `INSERT INTO leads (id, customer_name, contact_person, address, phone, email, country, country_code, port, status, is_customer, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'new', false, $10) RETURNING *`,
      [id, parsed.data.customerName ?? "", parsed.data.contactPerson ?? "", parsed.data.address ?? null, parsed.data.phone, parsed.data.email ?? null, parsed.data.country, parsed.data.countryCode, parsed.data.port ?? "", session.user.id]
    );
    lead = row ? serializeLead(row) : null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Lead create error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ lead }, { status: 201 });
}
