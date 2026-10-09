import { auth } from "@/lib/auth";
import { Suspense } from "react";
import LeadTable from "@/components/leads/LeadTable";
import CustomerTable from "@/components/leads/CustomerTable";
import LeadFilters from "@/components/leads/LeadFilters";
import LeadExcelUpload from "@/components/leads/LeadExcelUpload";
import LeadPagination from "@/components/leads/LeadPagination";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { getLeadsData, getCustomersData } from "@/lib/dashboard-data";

const ELEVATED = ["admin", "manager", "super_admin"];

const iconBox = (bg: string) => ({
  width: "40px", height: "40px", borderRadius: "8px",
  background: bg, display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
} as React.CSSProperties);

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const session = await auth();
  const params = await searchParams;
  const role = session!.user.role;
  const isElevated = ELEVATED.includes(role);
  const tab = params.tab === "customers" ? "customers" : "leads";

  const leadsData    = tab === "leads"     ? await getLeadsData(session!.user.id, role, params)    : null;
  const customersData = tab === "customers" ? await getCustomersData(session!.user.id, role, params) : null;

  const tabLink = (t: string, label: string, active: boolean) => (
    <Link
      href={t === "leads" ? "/dashboard" : "/dashboard?tab=customers"}
      style={{
        padding: "8px 18px",
        fontSize: "13px", fontWeight: 600,
        borderRadius: "8px",
        textDecoration: "none",
        background: active ? "#2563eb" : "transparent",
        color: active ? "#ffffff" : "#656d76",
        transition: "all 150ms",
      }}
    >
      {label}
    </Link>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />

      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1f2328" }}>
              {isElevated ? "CRM Dashboard" : "My Dashboard"}
            </h1>
            <p style={{ fontSize: "13px", color: "#656d76", marginTop: "2px" }}>
              {isElevated ? "Manage leads and customers" : "Your sales pipeline"}
            </p>
          </div>
          {!isElevated && tab === "leads" && (
            <Link
              href="/leads/new"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                color: "white", background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                textDecoration: "none", boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                transition: "all 150ms",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New Lead
            </Link>
          )}
        </div>

        {/* Agent: many leads at once from one Excel file */}
        {!isElevated && tab === "leads" && <LeadExcelUpload />}

        {/* Tabs */}
        <div style={{
          display: "inline-flex", gap: "4px", padding: "4px",
          background: "#f6f8fa", borderRadius: "10px", border: "1px solid #d0d7de",
          alignSelf: "flex-start",
        }}>
          {tabLink("leads", "Leads", tab === "leads")}
          {tabLink("customers", "Customers", tab === "customers")}
        </div>

        {/* ── LEADS TAB ── */}
        {tab === "leads" && leadsData && (
          <>
            <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
              {[
                { label: "Total Leads",  value: leadsData.stats.total,      bg: "#eff6ff", icon: "📋", accent: "#2563eb" },
                { label: "New",          value: leadsData.stats.newCount,   bg: "#f0fdf4", icon: "🆕", accent: "#16a34a" },
                { label: "In Progress",  value: leadsData.stats.inProgress, bg: "#fffbeb", icon: "⚡", accent: "#d97706" },
                { label: "Closed",       value: leadsData.stats.closed,     bg: "#f3f4f6", icon: "✓",  accent: "#6b7280" },
              ].map(({ label, value, bg, icon, accent }, i) => (
                <div key={label} className={`card-hover stagger-${i + 1} stat-card`} style={{
                  background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "10px",
                  padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}>
                  <div style={iconBox(bg)}>
                    <span style={{ fontSize: "18px" }}>{icon}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: "24px", fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</p>
                    <p style={{ fontSize: "12px", color: "#656d76", marginTop: "3px", fontWeight: 500 }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "10px",
              overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", flex: 1,
            }}>
              <div className="card-toolbar" style={{ padding: "14px 20px", borderBottom: "1px solid #f0f2f4", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328" }}>
                  Lead Pipeline · <span style={{ color: "#656d76", fontWeight: 400 }}>{leadsData.leads.length} record{leadsData.leads.length !== 1 ? "s" : ""}</span>
                </span>
                <Suspense>
                  <LeadFilters />
                </Suspense>
              </div>
              <LeadTable leads={leadsData.leads} showCreatedBy={isElevated} />
              <LeadPagination page={leadsData.page} totalPages={leadsData.totalPages} total={leadsData.matchTotal} limit={leadsData.limit} />
            </div>
          </>
        )}

        {/* ── CUSTOMERS TAB ── */}
        {tab === "customers" && customersData && (
          <>
            <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
              {[
                { label: "Total Customers",   value: customersData.stats.total,         bg: "#f0fdf4", icon: "🏢", accent: "#059669" },
                { label: "Total Invoices",    value: customersData.stats.totalInvoices,  bg: "#eff6ff", icon: "📄", accent: "#2563eb" },
                { label: "Pending Invoices",  value: customersData.stats.totalPending,   bg: "#fffbeb", icon: "⏳", accent: "#d97706" },
              ].map(({ label, value, bg, icon, accent }, i) => (
                <div key={label} className={`card-hover stagger-${i + 1} stat-card`} style={{
                  background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "10px",
                  padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}>
                  <div style={iconBox(bg)}>
                    <span style={{ fontSize: "18px" }}>{icon}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: "24px", fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</p>
                    <p style={{ fontSize: "12px", color: "#656d76", marginTop: "3px", fontWeight: 500 }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "10px",
              overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", flex: 1,
            }}>
              <div className="card-toolbar" style={{ padding: "14px 20px", borderBottom: "1px solid #f0f2f4", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328" }}>
                  Customers · <span style={{ color: "#656d76", fontWeight: 400 }}>{customersData.customers.length} record{customersData.customers.length !== 1 ? "s" : ""}</span>
                </span>
                <Suspense>
                  <LeadFilters />
                </Suspense>
              </div>
              <CustomerTable
                customers={customersData.customers}
                invoiceCounts={customersData.invoiceCounts}
                showCreatedBy={isElevated}
              />
              <LeadPagination page={customersData.page} totalPages={customersData.totalPages} total={customersData.matchTotal} limit={customersData.limit} />
            </div>
          </>
        )}

      </div>
    </div>
  );
}
