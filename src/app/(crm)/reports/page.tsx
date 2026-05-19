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

const today = new Date().toISOString().slice(0, 10);

export default function ReportsPage() {
  const [type, setType]           = useState<ReportType>("daily");
  const [dateFrom, setDateFrom]   = useState(today);
  const [dateTo, setDateTo]       = useState(today);
  const [data, setData]           = useState<ReportData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = (t: ReportType, from: string, to: string) => {
    setLoading(true);
    setError("");
    setSelectedId(null);
    const url = t === "custom"
      ? `/api/reports?type=custom&from=${from}&to=${to}`
      : `/api/reports?type=${t}`;
    fetch(url)
      .then(r => r.json())
      .then(j => { if (j.error) setError(j.error); else setData(j); })
      .catch(() => setError("Failed to load report"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (type !== "custom") load(type, dateFrom, dateTo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const handleCustomLoad = () => load("custom", dateFrom, dateTo);

  const exportCSV = (agents: AgentRow[], label: string) => {
    const rows = [
      ["Agent Name", "Leads", "Invoices", "Units"],
      ...agents.map(a => [a.name, a.leads, a.invoices, a.units]),
    ];
    if (agents.length > 1) {
      const totals = agents.reduce((acc, a) => ({ leads: acc.leads + a.leads, invoices: acc.invoices + a.invoices, units: acc.units + a.units }), { leads: 0, invoices: 0, units: 0 });
      rows.push(["TOTAL", totals.leads, totals.invoices, totals.units]);
    }
    const csv  = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `report-${label}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { key: ReportType; label: string }[] = [
    { key: "daily",   label: "Daily"        },
    { key: "weekly",  label: "Weekly"       },
    { key: "monthly", label: "Monthly"      },
    { key: "custom",  label: "Date Range"   },
  ];

  const col = { leads: "#2563eb", invoices: "#7c3aed", units: "#059669" };

  const visibleAgents = selectedId
    ? (data?.agents ?? []).filter(a => a.userId === selectedId)
    : (data?.agents ?? []);

  const visibleTotals = visibleAgents.reduce(
    (acc, a) => ({ leads: acc.leads + a.leads, invoices: acc.invoices + a.invoices, units: acc.units + a.units }),
    { leads: 0, invoices: 0, units: 0 }
  );

  const selectedAgent = selectedId ? data?.agents.find(a => a.userId === selectedId) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />

      <div style={{ padding: "20px 24px", borderBottom: "1px solid #d0d7de", background: "#ffffff" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1f2328" }}>Reports</h1>
        <p style={{ fontSize: "13px", color: "#656d76", marginTop: "2px" }}>Daily, weekly, monthly and custom-range performance reports — per agent or all agents</p>
      </div>

      <div style={{ flex: 1, padding: "24px", background: "#f6f8fa" }}>

        {/* Tabs + Export */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", gap: "6px", background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "8px", padding: "4px" }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                style={{
                  padding: "7px 16px", borderRadius: "6px", border: "none",
                  fontSize: "13px", fontWeight: 600, cursor: "pointer",
                  background: type === t.key ? "#c0272d" : "transparent",
                  color:      type === t.key ? "#ffffff" : "#656d76",
                  transition: "all 150ms",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {selectedAgent && (
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  padding: "7px 14px", borderRadius: "8px", border: "1px solid #d0d7de",
                  fontSize: "13px", fontWeight: 600, cursor: "pointer",
                  background: "#ffffff", color: "#656d76",
                }}
              >
                ← All Agents
              </button>
            )}
            <button
              onClick={() => data && exportCSV(visibleAgents, selectedAgent?.name ?? type)}
              disabled={!data || loading || visibleAgents.length === 0}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 16px", borderRadius: "8px", border: "none",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
                background: "#1f2328", color: "#ffffff",
                opacity: (!data || loading || visibleAgents.length === 0) ? 0.5 : 1,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export CSV{selectedAgent ? ` — ${selectedAgent.name}` : ""}
            </button>
          </div>
        </div>

        {/* Custom date range pickers */}
        {type === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "8px", padding: "12px 16px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328" }}>From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #d0d7de", fontSize: "13px", color: "#1f2328" }}
            />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328" }}>To</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #d0d7de", fontSize: "13px", color: "#1f2328" }}
            />
            <button
              onClick={handleCustomLoad}
              disabled={!dateFrom || !dateTo}
              style={{
                padding: "7px 18px", borderRadius: "6px", border: "none",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
                background: "#c0272d", color: "#ffffff",
                opacity: (!dateFrom || !dateTo) ? 0.5 : 1,
              }}
            >
              Load Report
            </button>
          </div>
        )}

        {/* Period label + selected agent banner */}
        {data && !loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <p style={{ fontSize: "13px", color: "#656d76", fontWeight: 500 }}>
              {data.period.label}
              {selectedAgent && <span style={{ color: "#c0272d", fontWeight: 700 }}> — {selectedAgent.name}</span>}
            </p>
            {selectedAgent && (
              <span style={{ fontSize: "12px", color: "#8c959f" }}>
                Click agent row again to deselect
              </span>
            )}
          </div>
        )}

        {/* Summary cards */}
        {data && !loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
            {[
              { label: selectedAgent ? `${selectedAgent.name}'s Leads`    : "Total Leads",    value: visibleTotals.leads,    color: col.leads    },
              { label: selectedAgent ? `${selectedAgent.name}'s Invoices` : "Total Invoices", value: visibleTotals.invoices, color: col.invoices },
              { label: selectedAgent ? `${selectedAgent.name}'s Units`    : "Total Units",    value: visibleTotals.units,    color: col.units    },
            ].map(c => (
              <div key={c.label} style={{
                background: "#ffffff", border: "1px solid #d0d7de",
                borderRadius: "10px", padding: "16px 20px",
                borderLeft: `4px solid ${c.color}`,
              }}>
                <p style={{ fontSize: "12px", color: "#656d76", fontWeight: 500 }}>{c.label}</p>
                <p style={{ fontSize: "28px", fontWeight: 700, color: c.color, marginTop: "4px" }}>{c.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div style={{ background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px 110px 80px", padding: "11px 20px", background: "#f6f8fa", borderBottom: "1px solid #d0d7de" }}>
            {["Agent", "Leads", "Invoices", "Units", ""].map((h, i) => (
              <span key={i} style={{ fontSize: "12px", fontWeight: 700, color: "#656d76", textAlign: i > 0 && i < 4 ? "center" : "left" }}>{h}</span>
            ))}
          </div>

          {loading && (
            <div style={{ padding: "48px", textAlign: "center", color: "#656d76", fontSize: "14px" }}>Loading report…</div>
          )}

          {error && !loading && (
            <div style={{ padding: "32px", textAlign: "center", color: "#cf222e", fontSize: "14px" }}>{error}</div>
          )}

          {!loading && !error && data && (
            <>
              {visibleAgents.length === 0 ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#656d76", fontSize: "14px" }}>
                  No activity in this period.
                </div>
              ) : (
                visibleAgents.map((a, idx) => {
                  const isSelected = selectedId === a.userId;
                  return (
                    <div
                      key={a.userId}
                      onClick={() => setSelectedId(isSelected ? null : a.userId)}
                      style={{
                        display: "grid", gridTemplateColumns: "1fr 110px 110px 110px 80px",
                        padding: "13px 20px",
                        borderBottom: idx < visibleAgents.length - 1 ? "1px solid #f0f2f4" : "none",
                        background: isSelected ? "#fff8f8" : idx % 2 === 0 ? "#ffffff" : "#fafbfc",
                        cursor: "pointer",
                        outline: isSelected ? "2px solid #c0272d" : "none",
                        outlineOffset: "-2px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
                          background: isSelected
                            ? "linear-gradient(135deg, #c0272d, #7b0e12)"
                            : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "12px", fontWeight: 700, color: "white",
                        }}>
                          {a.name[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328" }}>{a.name}</span>
                        {isSelected && <span style={{ fontSize: "10px", background: "#c0272d", color: "white", borderRadius: "4px", padding: "1px 6px", fontWeight: 700 }}>SELECTED</span>}
                      </div>
                      <Pill value={a.leads}    color={col.leads}    />
                      <Pill value={a.invoices} color={col.invoices} />
                      <Pill value={a.units}    color={col.units}    />
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <button
                          onClick={e => { e.stopPropagation(); exportCSV([a], a.name); }}
                          title={`Export ${a.name}'s report`}
                          style={{
                            padding: "4px 8px", borderRadius: "5px", border: "1px solid #d0d7de",
                            background: "#ffffff", cursor: "pointer", fontSize: "11px",
                            color: "#656d76", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px",
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          CSV
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {visibleAgents.length > 1 && (
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 110px 110px 110px 80px",
                  padding: "13px 20px",
                  background: "#f6f8fa", borderTop: "2px solid #d0d7de",
                }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#1f2328" }}>TOTAL</span>
                  <Pill value={visibleTotals.leads}    color={col.leads}    bold />
                  <Pill value={visibleTotals.invoices} color={col.invoices} bold />
                  <Pill value={visibleTotals.units}    color={col.units}    bold />
                  <span />
                </div>
              )}
            </>
          )}
        </div>

        {!loading && !error && data && !selectedId && data.agents.length > 0 && (
          <p style={{ fontSize: "12px", color: "#8c959f", marginTop: "10px", textAlign: "center" }}>
            Click any agent row to view individual report · Each row has its own CSV export button
          </p>
        )}
      </div>
    </div>
  );
}

function Pill({ value, color, bold = false }: { value: number; color: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <span style={{
        display: "inline-block", minWidth: "36px", textAlign: "center",
        padding: "3px 10px", borderRadius: "20px", fontSize: "12px",
        fontWeight: bold ? 700 : 600,
        background: `${color}18`, color,
      }}>
        {value}
      </span>
    </div>
  );
}
