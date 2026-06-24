"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/layout/TopBar";

type ReportType = "daily" | "weekly" | "monthly" | "custom";

interface AgentRow { userId: string; name: string; leads: number; invoices: number; units: number; }
interface ReportData {
  period: { start: string; end: string; label: string };
  agents: AgentRow[];
  totals: { leads: number; invoices: number; units: number };
}
interface DetailData {
  leads:    { _id: string; customerName?: string; phone?: string; status?: string; createdAt: string }[];
  invoices: { _id: string; unit?: string; cnfPrice?: number; consignee?: { name?: string }; createdAt: string }[];
  units:    { _id: string; unit?: string; chassisNo?: string; color?: string; createdAt: string }[];
}

const today = new Date().toISOString().slice(0, 10);
const col = { leads: "#2563eb", invoices: "#7c3aed", units: "#059669" };

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function ReportsPage() {
  const [type, setType]         = useState<ReportType>("daily");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo]     = useState(today);
  const [dailyDate, setDailyDate] = useState(today);
  const [data, setData]         = useState<ReportData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // Detail modal state
  const [viewAgent, setViewAgent]       = useState<AgentRow | null>(null);
  const [detail, setDetail]             = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab]       = useState<"leads"|"invoices"|"units">("leads");

  const load = (t: ReportType, from: string, to: string, day?: string) => {
    setLoading(true); setError("");
    const url =
      t === "custom"      ? `/api/reports?type=custom&from=${from}&to=${to}`
      : t === "daily"     ? `/api/reports?type=daily&date=${day ?? dailyDate}`
      :                     `/api/reports?type=${t}`;
    fetch(url)
      .then(r => r.json())
      .then(j => { if (j.error) setError(j.error); else setData(j); })
      .catch(() => setError("Failed to load report"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (type !== "custom") load(type, dateFrom, dateTo, dailyDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const openView = (agent: AgentRow) => {
    setViewAgent(agent);
    setDetail(null);
    setDetailTab("leads");
    setDetailLoading(true);
    const base = `/api/reports/detail?userId=${agent.userId}&type=${type}`;
    const url  =
      type === "custom" ? `${base}&from=${dateFrom}&to=${dateTo}`
      : type === "daily" ? `${base}&date=${dailyDate}`
      : base;
    fetch(url)
      .then(r => r.json())
      .then(j => setDetail(j))
      .catch(() => setDetail({ leads: [], invoices: [], units: [] }))
      .finally(() => setDetailLoading(false));
  };

  const closeView = () => { setViewAgent(null); setDetail(null); };

  const exportCSV = (agents: AgentRow[], label: string) => {
    const rows = [
      ["Agent Name", "Leads", "Invoices", "Units"],
      ...agents.map(a => [a.name, a.leads, a.invoices, a.units]),
    ];
    if (agents.length > 1) {
      const t = agents.reduce((acc, a) => ({ leads: acc.leads + a.leads, invoices: acc.invoices + a.invoices, units: acc.units + a.units }), { leads: 0, invoices: 0, units: 0 });
      rows.push(["TOTAL", t.leads, t.invoices, t.units]);
    }
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `report-${label}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDetailCSV = () => {
    if (!detail || !viewAgent) return;
    const rows: (string | number)[][] = [["Type", "Name/Unit", "Details", "Date"]];
    detail.leads.forEach(l => rows.push(["Lead", l.customerName ?? "-", l.phone ?? "-", fmtDate(l.createdAt)]));
    detail.invoices.forEach(i => rows.push(["Invoice", i.unit ?? "-", `$${i.cnfPrice ?? 0}`, fmtDate(i.createdAt)]));
    detail.units.forEach(u => rows.push(["Unit", u.unit ?? "-", u.chassisNo ?? "-", fmtDate(u.createdAt)]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `detail-${viewAgent.name}-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { key: ReportType; label: string }[] = [
    { key: "daily",   label: "Daily"      },
    { key: "weekly",  label: "Weekly"     },
    { key: "monthly", label: "Monthly"    },
    { key: "custom",  label: "Date Range" },
  ];

  const agents   = data?.agents ?? [];
  const totals   = data?.totals ?? { leads: 0, invoices: 0, units: 0 };
  const period   = data?.period.label ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, position: "relative" }}>
      <TopBar />

      <div style={{ padding: "20px 24px", borderBottom: "1px solid #d0d7de", background: "#ffffff" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1f2328" }}>Reports</h1>
        <p style={{ fontSize: "13px", color: "#656d76", marginTop: "2px" }}>Daily, weekly, monthly and custom-range reports — view or export per agent</p>
      </div>

      <div style={{ flex: 1, padding: "24px", background: "#f6f8fa" }}>

        {/* Tabs + Export All */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", gap: "6px", background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "8px", padding: "4px" }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setType(t.key)} style={{
                padding: "7px 16px", borderRadius: "6px", border: "none",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
                background: type === t.key ? "#c0272d" : "transparent",
                color:      type === t.key ? "#ffffff" : "#656d76",
                transition: "all 150ms",
              }}>
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => data && exportCSV(agents, type)}
            disabled={!data || loading || agents.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 16px", borderRadius: "8px", border: "none",
              fontSize: "13px", fontWeight: 600, cursor: "pointer",
              background: "#1f2328", color: "#ffffff",
              opacity: (!data || loading || agents.length === 0) ? 0.5 : 1,
            }}
          >
            <DownloadIcon /> Export All CSV
          </button>
        </div>

        {/* Daily single date picker */}
        {type === "daily" && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "8px", padding: "12px 16px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328" }}>Select Date</span>
            <input type="date" value={dailyDate} max={today} onChange={e => setDailyDate(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #d0d7de", fontSize: "13px" }} />
            <button onClick={() => load("daily", dateFrom, dateTo, dailyDate)} disabled={!dailyDate}
              style={{ padding: "7px 18px", borderRadius: "6px", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer", background: "#c0272d", color: "#ffffff" }}>
              Load Report
            </button>
            {dailyDate !== today && (
              <button onClick={() => { setDailyDate(today); load("daily", dateFrom, dateTo, today); }}
                style={{ padding: "7px 14px", borderRadius: "6px", border: "1px solid #d0d7de", fontSize: "13px", fontWeight: 600, cursor: "pointer", background: "#ffffff", color: "#656d76" }}>
                Today
              </button>
            )}
          </div>
        )}

        {/* Custom date pickers */}
        {type === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "8px", padding: "12px 16px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328" }}>From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #d0d7de", fontSize: "13px" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328" }}>To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #d0d7de", fontSize: "13px" }} />
            <button onClick={() => load("custom", dateFrom, dateTo)} disabled={!dateFrom || !dateTo}
              style={{ padding: "7px 18px", borderRadius: "6px", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer", background: "#c0272d", color: "#ffffff" }}>
              Load Report
            </button>
          </div>
        )}

        {/* Period label */}
        {data && !loading && (
          <p style={{ fontSize: "13px", color: "#656d76", fontWeight: 500, marginBottom: "16px" }}>{period}</p>
        )}

        {/* Summary cards */}
        {data && !loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
            {[
              { label: "Total Leads",    value: totals.leads,    color: col.leads    },
              { label: "Total Invoices", value: totals.invoices, color: col.invoices },
              { label: "Total Units",    value: totals.units,    color: col.units    },
            ].map(c => (
              <div key={c.label} style={{ background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "10px", padding: "16px 20px", borderLeft: `4px solid ${c.color}` }}>
                <p style={{ fontSize: "12px", color: "#656d76", fontWeight: 500 }}>{c.label}</p>
                <p style={{ fontSize: "28px", fontWeight: 700, color: c.color, marginTop: "4px" }}>{c.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Agent Table */}
        <div style={{ background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px 160px", padding: "11px 20px", background: "#f6f8fa", borderBottom: "1px solid #d0d7de" }}>
            {["Agent", "Leads", "Invoices", "Units", "Actions"].map((h, i) => (
              <span key={h} style={{ fontSize: "12px", fontWeight: 700, color: "#656d76", textAlign: i > 0 && i < 4 ? "center" : "left" }}>{h}</span>
            ))}
          </div>

          {loading && <div style={{ padding: "48px", textAlign: "center", color: "#656d76", fontSize: "14px" }}>Loading…</div>}
          {error && !loading && <div style={{ padding: "32px", textAlign: "center", color: "#cf222e", fontSize: "14px" }}>{error}</div>}

          {!loading && !error && data && (
            <>
              {agents.length === 0 ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#656d76", fontSize: "14px" }}>No activity in this period.</div>
              ) : (
                agents.map((a, idx) => (
                  <div key={a.userId} style={{
                    display: "grid", gridTemplateColumns: "1fr 90px 90px 90px 160px",
                    padding: "13px 20px",
                    borderBottom: idx < agents.length - 1 ? "1px solid #f0f2f4" : "none",
                    background: idx % 2 === 0 ? "#ffffff" : "#fafbfc",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{
                        width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
                        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "12px", fontWeight: 700, color: "white",
                      }}>
                        {a.name[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328" }}>{a.name}</span>
                    </div>
                    <Pill value={a.leads}    color={col.leads}    />
                    <Pill value={a.invoices} color={col.invoices} />
                    <Pill value={a.units}    color={col.units}    />
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {/* View button */}
                      <button
                        onClick={() => openView(a)}
                        style={{
                          display: "flex", alignItems: "center", gap: "4px",
                          padding: "5px 10px", borderRadius: "6px",
                          border: "1px solid #2563eb", background: "#eff6ff",
                          fontSize: "12px", fontWeight: 600, color: "#2563eb", cursor: "pointer",
                        }}
                      >
                        <EyeIcon /> View
                      </button>
                      {/* Export button */}
                      <button
                        onClick={() => exportCSV([a], a.name)}
                        style={{
                          display: "flex", alignItems: "center", gap: "4px",
                          padding: "5px 10px", borderRadius: "6px",
                          border: "1px solid #d0d7de", background: "#ffffff",
                          fontSize: "12px", fontWeight: 600, color: "#656d76", cursor: "pointer",
                        }}
                      >
                        <DownloadIcon /> Export
                      </button>
                    </div>
                  </div>
                ))
              )}

              {agents.length > 1 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px 160px", padding: "13px 20px", background: "#f6f8fa", borderTop: "2px solid #d0d7de" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#1f2328" }}>TOTAL</span>
                  <Pill value={totals.leads}    color={col.leads}    bold />
                  <Pill value={totals.invoices} color={col.invoices} bold />
                  <Pill value={totals.units}    color={col.units}    bold />
                  <span />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {viewAgent && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "20px",
        }} onClick={closeView}>
          <div style={{
            background: "#ffffff", borderRadius: "12px", width: "100%", maxWidth: "700px",
            maxHeight: "85vh", display: "flex", flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }} onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #d0d7de", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1f2328", margin: 0 }}>{viewAgent.name}</h2>
                <p style={{ fontSize: "12px", color: "#656d76", margin: "2px 0 0" }}>{period}</p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button onClick={exportDetailCSV} style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "7px 14px", borderRadius: "7px", border: "none",
                  fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  background: "#1f2328", color: "#ffffff",
                }}>
                  <DownloadIcon /> Export CSV
                </button>
                <button onClick={closeView} style={{
                  width: "30px", height: "30px", borderRadius: "50%", border: "1px solid #d0d7de",
                  background: "#ffffff", cursor: "pointer", fontSize: "16px", color: "#656d76",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>×</button>
              </div>
            </div>

            {/* Summary pills */}
            <div style={{ padding: "14px 24px", borderBottom: "1px solid #d0d7de", display: "flex", gap: "12px" }}>
              {[
                { key: "leads",    label: "Leads",    count: viewAgent.leads,    color: col.leads    },
                { key: "invoices", label: "Invoices", count: viewAgent.invoices, color: col.invoices },
                { key: "units",    label: "Units",    count: viewAgent.units,    color: col.units    },
              ].map(t => (
                <button key={t.key} onClick={() => setDetailTab(t.key as typeof detailTab)} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "7px 16px", borderRadius: "20px", cursor: "pointer", border: "none",
                  background: detailTab === t.key ? t.color : `${t.color}15`,
                  color:      detailTab === t.key ? "#ffffff" : t.color,
                  fontWeight: 700, fontSize: "13px", transition: "all 150ms",
                }}>
                  {t.label}
                  <span style={{
                    background: detailTab === t.key ? "rgba(255,255,255,0.3)" : t.color,
                    color: "#ffffff", borderRadius: "10px", padding: "1px 7px", fontSize: "11px",
                  }}>{t.count}</span>
                </button>
              ))}
            </div>

            {/* Detail list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 20px" }}>
              {detailLoading ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#656d76" }}>Loading details…</div>
              ) : !detail ? null : (
                <>
                  {detailTab === "leads" && (
                    <DetailTable
                      headers={["Customer Name", "Phone", "Status", "Date"]}
                      rows={detail.leads.map(l => [l.customerName ?? "—", l.phone ?? "—", l.status ?? "—", fmtDate(l.createdAt)])}
                      color={col.leads}
                      empty="No leads in this period"
                    />
                  )}
                  {detailTab === "invoices" && (
                    <DetailTable
                      headers={["Unit", "Consignee", "Amount", "Date"]}
                      rows={detail.invoices.map(i => [i.unit ?? "—", i.consignee?.name ?? "—", `$${(i.cnfPrice ?? 0).toLocaleString("en-US")}`, fmtDate(i.createdAt)])}
                      color={col.invoices}
                      empty="No invoices in this period"
                    />
                  )}
                  {detailTab === "units" && (
                    <DetailTable
                      headers={["Unit", "Chassis No.", "Color", "Date"]}
                      rows={detail.units.map(u => [u.unit ?? "—", u.chassisNo ?? "—", u.color ?? "—", fmtDate(u.createdAt)])}
                      color={col.units}
                      empty="No units in this period"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailTable({ headers, rows, color, empty }: { headers: string[]; rows: string[][]; color: string; empty: string }) {
  if (rows.length === 0) {
    return <div style={{ padding: "32px", textAlign: "center", color: "#656d76", fontSize: "13px" }}>{empty}</div>;
  }
  return (
    <div style={{ marginTop: "16px", border: "1px solid #d0d7de", borderRadius: "8px", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${headers.length}, 1fr)`, padding: "9px 16px", background: "#f6f8fa", borderBottom: "1px solid #d0d7de" }}>
        {headers.map(h => <span key={h} style={{ fontSize: "11px", fontWeight: 700, color: "#656d76", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>)}
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{
          display: "grid", gridTemplateColumns: `repeat(${headers.length}, 1fr)`,
          padding: "10px 16px",
          borderBottom: i < rows.length - 1 ? "1px solid #f0f2f4" : "none",
          background: i % 2 === 0 ? "#ffffff" : "#fafbfc",
        }}>
          {row.map((cell, j) => (
            <span key={j} style={{ fontSize: "12px", color: j === 0 ? color : "#1f2328", fontWeight: j === 0 ? 600 : 400 }}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

function Pill({ value, color, bold = false }: { value: number; color: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <span style={{ display: "inline-block", minWidth: "36px", textAlign: "center", padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: bold ? 700 : 600, background: `${color}18`, color }}>
        {value}
      </span>
    </div>
  );
}

function EyeIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}

function DownloadIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
}
