import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { query } from "@/lib/pg";
import { serializeLead } from "@/lib/serialize";
import LeadTable from "@/components/leads/LeadTable";
import LeadFilters from "@/components/leads/LeadFilters";
import LeadPagination from "@/components/leads/LeadPagination";
import BulkLeadTools from "@/components/leads/BulkLeadTools";
import TopBar from "@/components/layout/TopBar";

const ELEVATED = ["admin", "manager", "super_admin"];

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session || !ELEVATED.includes(session.user.role)) redirect("/dashboard");

  const params = await searchParams;

  // Date range (applied to both the leads table AND the per-agent counts)
  const dateFrom = params.from ? new Date(params.from) : null;
  const dateTo = params.to ? (() => { const d = new Date(params.to); d.setHours(23, 59, 59, 999); return d; })() : null;

  const where: string[] = [];
  const filterParams: unknown[] = [];
  const p = (v: unknown) => { filterParams.push(v); return `$${filterParams.length}`; };

  if (params.search) where.push(`(l.customer_name ILIKE ${p(`%${params.search.trim()}%`)} OR l.contact_person ILIKE ${p(`%${params.search.trim()}%`)} OR l.phone ILIKE ${p(`%${params.search.trim()}%`)})`);
  if (params.country) where.push(`l.country = ${p(params.country)}`);
  if (params.status)  where.push(`l.status = ${p(params.status)}`);
  if (params.agentId) where.push(`l.created_by = ${p(params.agentId)}`);
  if (dateFrom)        where.push(`l.created_at >= ${p(dateFrom)}`);
  if (dateTo)          where.push(`l.created_at <= ${p(dateTo)}`);
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // Per-agent counts respect the selected date (but not agent/search/status)
  const countWhere: string[] = [];
  const countParams: unknown[] = [];
  const cp = (v: unknown) => { countParams.push(v); return `$${countParams.length}`; };
  if (dateFrom) countWhere.push(`created_at >= ${cp(dateFrom)}`);
  if (dateTo)   countWhere.push(`created_at <= ${cp(dateTo)}`);
  const countWhereSql = countWhere.length ? `WHERE ${countWhere.join(" AND ")}` : "";

  // Pagination
  const limit = Math.min(Math.max(parseInt(params.limit || "50") || 50, 1), 500);
  const page  = Math.max(parseInt(params.page || "1") || 1, 1);

  const totalCountParams = [...filterParams];
  const pageParams = [...filterParams, limit, (page - 1) * limit];

  const [leadRows, totalRow, agentRows, agentCounts] = await Promise.all([
    query(
      `SELECT l.*, u.name AS created_by_name, u.email AS created_by_email FROM leads l LEFT JOIN users u ON u.id = l.created_by
       ${whereSql} ORDER BY l.created_at DESC LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
      pageParams
    ),
    query<{ count: string }>(`SELECT count(*) FROM leads l ${whereSql}`, totalCountParams),
    query<{ id: string; name: string; email: string }>(`SELECT id, name, email FROM users WHERE role = 'user' ORDER BY name ASC`),
    query<{ created_by: string; count: string }>(`SELECT created_by, count(*) FROM leads ${countWhereSql} GROUP BY created_by`, countParams),
  ]);
  const matchTotal = Number(totalRow[0]?.count ?? 0);
  const totalPages = Math.max(Math.ceil(matchTotal / limit), 1);

  // Count leads per agent
  const countMap: Record<string, number> = {};
  for (const r of agentCounts) {
    if (r.created_by) countMap[r.created_by] = Number(r.count);
  }

  // Preserve current filters (date/search/status) when toggling an agent card
  const buildAgentHref = (agentId: string, isSelected: boolean) => {
    const p = new URLSearchParams();
    if (params.search) p.set("search", params.search);
    if (params.status) p.set("status", params.status);
    if (params.from)   p.set("from", params.from);
    if (params.to)     p.set("to", params.to);
    if (!isSelected)   p.set("agentId", agentId);
    const qs = p.toString();
    return qs ? `/admin/leads?${qs}` : "/admin/leads";
  };

  const leadsData  = leadRows.map(serializeLead);
  const agentsData = agentRows.map(a => ({ _id: a.id, name: a.name, email: a.email }));

  // Supervisor-only: imported (unassigned) leads grouped by country
  const isSupervisor = session.user.role === "super_admin";
  let unassignedData: { country: string; count: number }[] = [];
  if (isSupervisor) {
    const grouped = await query<{ country: string; count: string }>(
      `SELECT country, count(*) FROM leads WHERE created_by = $1 GROUP BY country ORDER BY country ASC`,
      [session.user.id]
    );
    unassignedData = grouped.map(g => ({ country: g.country, count: Number(g.count) }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1f2328" }}>All Leads</h1>
          <p style={{ fontSize: "13px", color: "#656d76", marginTop: "2px" }}>Viewing all leads from all agents</p>
        </div>

        {/* Supervisor: bulk import + assign by country */}
        {isSupervisor && <BulkLeadTools agents={agentsData} unassigned={unassignedData} />}

        {/* Agent stats cards */}
        {agentsData.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {agentsData.map((agent: { _id: string; name: string; email: string }) => {
              const count = countMap[agent._id] ?? 0;
              const isSelected = params.agentId === agent._id;
              return (
                <a
                  key={agent._id}
                  href={buildAgentHref(agent._id, isSelected)}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 16px", borderRadius: "8px", textDecoration: "none",
                    border: `1px solid ${isSelected ? "#c0272d" : "#d0d7de"}`,
                    background: isSelected ? "#fef2f2" : "#ffffff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    transition: "all 150ms",
                  }}
                >
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                    background: isSelected ? "linear-gradient(135deg,#c0272d,#7b0e12)" : "linear-gradient(135deg,#475569,#334155)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 700, color: "white",
                  }}>
                    {agent.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: isSelected ? "#c0272d" : "#1f2328", lineHeight: 1.2 }}>{agent.name}</p>
                    <p style={{ fontSize: "11px", color: "#8c959f", marginTop: "2px" }}>
                      {count} lead{count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Leads table */}
        <div style={{
          background: "#ffffff", border: "1px solid #d0d7de",
          borderRadius: "10px", overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)", flex: 1,
        }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f2f4", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328" }}>
              {params.agentId
                ? `${agentsData.find((a: { _id: string; name: string }) => a._id === params.agentId)?.name ?? "Agent"}'s Leads`
                : "All Leads"
              } · <span style={{ color: "#656d76", fontWeight: 400 }}>{matchTotal} record{matchTotal !== 1 ? "s" : ""}</span>
            </span>
            <Suspense>
              <LeadFilters />
            </Suspense>
          </div>
          <LeadTable leads={leadsData} showCreatedBy />
          <LeadPagination page={page} totalPages={totalPages} total={matchTotal} limit={limit} />
        </div>
      </div>
    </div>
  );
}
