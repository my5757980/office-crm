import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import dbConnect from "@/lib/db";
import Lead from "@/models/Lead";
import User from "@/models/User";
import LeadTable from "@/components/leads/LeadTable";
import LeadFilters from "@/components/leads/LeadFilters";
import TopBar from "@/components/layout/TopBar";

const ELEVATED = ["admin", "manager", "super_admin"];

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session || !ELEVATED.includes(session.user.role)) redirect("/dashboard");

  await dbConnect();
  const params = await searchParams;

  const filter: Record<string, unknown> = {};
  if (params.search)    filter.customerName = { $regex: params.search, $options: "i" };
  if (params.country)   filter.country = params.country;
  if (params.status)    filter.status = params.status;
  if (params.agentId)   filter.createdBy = params.agentId;
  if (params.from || params.to) {
    filter.createdAt = {};
    if (params.from) (filter.createdAt as Record<string, Date>).$gte = new Date(params.from);
    if (params.to)   (filter.createdAt as Record<string, Date>).$lte = new Date(params.to);
  }

  const [leads, agents, allLeads] = await Promise.all([
    Lead.find(filter).populate("createdBy", "name email").sort({ createdAt: -1 }).limit(200).lean(),
    User.find({ role: "user" }, "name email").sort({ name: 1 }).lean(),
    Lead.find({}).select("createdBy").lean(),
  ]);

  // Count leads per agent
  const countMap: Record<string, number> = {};
  for (const l of allLeads) {
    const id = l.createdBy?.toString();
    if (id) countMap[id] = (countMap[id] ?? 0) + 1;
  }

  const leadsData  = JSON.parse(JSON.stringify(leads));
  const agentsData = JSON.parse(JSON.stringify(agents));

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1f2328" }}>All Leads</h1>
          <p style={{ fontSize: "13px", color: "#656d76", marginTop: "2px" }}>Viewing all leads from all agents</p>
        </div>

        {/* Agent stats cards */}
        {agentsData.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {agentsData.map((agent: { _id: string; name: string; email: string }) => {
              const count = countMap[agent._id] ?? 0;
              const isSelected = params.agentId === agent._id;
              return (
                <a
                  key={agent._id}
                  href={isSelected ? "/admin/leads" : `/admin/leads?agentId=${agent._id}`}
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
              } · <span style={{ color: "#656d76", fontWeight: 400 }}>{leadsData.length} record{leadsData.length !== 1 ? "s" : ""}</span>
            </span>
            <Suspense>
              <LeadFilters />
            </Suspense>
          </div>
          <LeadTable leads={leadsData} showCreatedBy />
        </div>
      </div>
    </div>
  );
}
