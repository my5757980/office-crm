// The Leads and Customers tabs of the dashboard (app/(crm)/dashboard/page.tsx).
// Every leads column is written as l.<column>: the lists join users (for the
// agent's name), and users has its own created_at - an unqualified created_at
// made the date filter fail with "column reference is ambiguous".
import { query } from "@/lib/pg";
import { serializeLead } from "@/lib/serialize";
import { dateRange } from "@/lib/date-range";

const ELEVATED = ["admin", "manager", "super_admin"];

function parsePaging(searchParams: Record<string, string>) {
  const limit = Math.min(Math.max(parseInt(searchParams.limit || "50") || 50, 1), 500);
  const page  = Math.max(parseInt(searchParams.page || "1") || 1, 1);
  return { limit, page };
}

export async function getLeadsData(userId: string, role: string, searchParams: Record<string, string>) {
  const isElevated = ELEVATED.includes(role);

  const baseWhere: string[] = ["(l.is_customer IS NOT TRUE)"];
  const baseParams: unknown[] = [];
  const bp = (v: unknown) => { baseParams.push(v); return `$${baseParams.length}`; };
  if (!isElevated) baseWhere.push(`l.created_by = ${bp(userId)}`);
  const baseWhereSql = baseWhere.join(" AND ");

  const where: string[] = [...baseWhere];
  const params: unknown[] = [...baseParams];
  const p = (v: unknown) => { params.push(v); return `$${params.length}`; };
  if (searchParams.search) where.push(`(l.customer_name ILIKE ${p(`%${searchParams.search.trim()}%`)} OR l.contact_person ILIKE ${p(`%${searchParams.search.trim()}%`)} OR l.phone ILIKE ${p(`%${searchParams.search.trim()}%`)})`);
  if (searchParams.status) where.push(`l.status = ${p(searchParams.status)}`);
  const range = dateRange(searchParams.from, searchParams.to);
  if (range.from) where.push(`l.created_at >= ${p(range.from)}`);
  if (range.toExclusive) where.push(`l.created_at < ${p(range.toExclusive)}`);
  const whereSql = `WHERE ${where.join(" AND ")}`;

  const { limit, page } = parsePaging(searchParams);
  const pageParams = [...params, limit, (page - 1) * limit];

  const [leadRows, totalRow, totalCountRow, newCountRow, inProgressRow, closedRow] = await Promise.all([
    query(
      `SELECT l.*, u.name AS created_by_name, u.email AS created_by_email FROM leads l LEFT JOIN users u ON u.id = l.created_by
       ${whereSql} ORDER BY l.created_at DESC LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
      pageParams
    ),
    query<{ count: string }>(`SELECT count(*) FROM leads l ${whereSql}`, params),
    query<{ count: string }>(`SELECT count(*) FROM leads l WHERE ${baseWhereSql}`, baseParams),
    query<{ count: string }>(`SELECT count(*) FROM leads l WHERE ${baseWhereSql} AND l.status = 'new'`, baseParams),
    query<{ count: string }>(`SELECT count(*) FROM leads l WHERE ${baseWhereSql} AND l.status = 'in_progress'`, baseParams),
    query<{ count: string }>(`SELECT count(*) FROM leads l WHERE ${baseWhereSql} AND l.status = 'closed'`, baseParams),
  ]);

  const matchTotal = Number(totalRow[0]?.count ?? 0);

  return {
    leads: leadRows.map(serializeLead),
    stats: {
      total: Number(totalCountRow[0]?.count ?? 0),
      newCount: Number(newCountRow[0]?.count ?? 0),
      inProgress: Number(inProgressRow[0]?.count ?? 0),
      closed: Number(closedRow[0]?.count ?? 0),
    },
    page, limit, matchTotal, totalPages: Math.max(Math.ceil(matchTotal / limit), 1),
  };
}

export async function getCustomersData(userId: string, role: string, searchParams: Record<string, string>) {
  const isElevated = ELEVATED.includes(role);

  const where: string[] = ["l.is_customer = true"];
  const params: unknown[] = [];
  const p = (v: unknown) => { params.push(v); return `$${params.length}`; };
  if (!isElevated) where.push(`l.created_by = ${p(userId)}`);
  if (searchParams.search) where.push(`(l.customer_name ILIKE ${p(`%${searchParams.search.trim()}%`)} OR l.contact_person ILIKE ${p(`%${searchParams.search.trim()}%`)} OR l.phone ILIKE ${p(`%${searchParams.search.trim()}%`)})`);
  // The same filter bar sits on this tab, so its dates work here too.
  const range = dateRange(searchParams.from, searchParams.to);
  if (range.from) where.push(`l.created_at >= ${p(range.from)}`);
  if (range.toExclusive) where.push(`l.created_at < ${p(range.toExclusive)}`);
  const whereSql = `WHERE ${where.join(" AND ")}`;

  const { limit, page } = parsePaging(searchParams);
  const pageParams = [...params, limit, (page - 1) * limit];

  const [customerRows, totalRow] = await Promise.all([
    query(
      `SELECT l.*, u.name AS created_by_name, u.email AS created_by_email FROM leads l LEFT JOIN users u ON u.id = l.created_by
       ${whereSql} ORDER BY l.created_at DESC LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
      pageParams
    ),
    query<{ count: string }>(`SELECT count(*) FROM leads l ${whereSql}`, params),
  ]);
  const matchTotal = Number(totalRow[0]?.count ?? 0);

  const customerIds = customerRows.map(c => c.id as string);
  const invoiceRows = customerIds.length > 0
    ? await query<{ lead_id: string; status: string }>(`SELECT lead_id, status FROM invoices WHERE lead_id = ANY($1)`, [customerIds])
    : [];

  const countMap: Record<string, { total: number; pending: number }> = {};
  for (const inv of invoiceRows) {
    const key = inv.lead_id;
    if (!countMap[key]) countMap[key] = { total: 0, pending: 0 };
    countMap[key].total++;
    if (inv.status === "pending") countMap[key].pending++;
  }

  const totalPending = Object.values(countMap).reduce((s, v) => s + v.pending, 0);
  const totalInvoices = invoiceRows.length;

  return {
    customers: customerRows.map(serializeLead),
    invoiceCounts: countMap,
    stats: { total: matchTotal, totalInvoices, totalPending },
    page, limit, matchTotal, totalPages: Math.max(Math.ceil(matchTotal / limit), 1),
  };
}
