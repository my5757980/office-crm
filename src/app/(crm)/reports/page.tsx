"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/layout/TopBar";

type ReportType = "daily" | "weekly" | "monthly";

interface AgentRow { userId: string; name: string; leads: number; invoices: number; units: number; }
interface ReportData {
  period: { start: string; end: string; label: string };
  agents: AgentRow[];
  totals: { leads: number; invoices: number; units: number };
}

export default function ReportsPage() {
  const [type, setType]     = useState<ReportType>("daily");
  const [data, setData]     = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/reports?type=${type}`)
      .then(r => r.json())
      .then(j => { if (j.error) setError(j.error); else setData(j); })
      .catch(() => setError("Failed to load report"))
      .finally(() => setLoading(false));
  }, [type]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ["Agent Name", "Leads", "Invoices", "Units"],
      ...data.agents.map(a => [a.name, a.leads, a.invoices, a.units]),
      ["TOTAL", data.totals.leads, data.totals.invoices, data.totals.units],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `report-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { key: ReportType; label: string }[] = [
    { key: "daily",   label: "Daily"   },
    { key: "weekly",  label: "Weekly"  },
    { key: "monthly", label: "Monthly" },
  ];

  const col = { leads: "#2563eb", invoices: "#7c3aed", units: "#059669" };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />

      {/* Page header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #d0d7de", background: "#ffffff" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1f2328" }}>Reports</h1>
        <p style={{ fontSize: "13px", color: "#656d76", marginTop: "2px" }}>View daily, weekly, and monthly performance reports</p>
      </div>

      <div style={{ flex: 1, padding: "24px", background: "#f6f8fa" }}>

        {/* Tabs + Export */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", gap: "6px", background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "8px", padding: "4px" }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                style={{
                  padding: "7px 20px", borderRadius: "6px", border: "none",
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

          <button
            onClick={exportCSV}
            disabled={!data || loading}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 16px", borderRadius: "8px", border: "none",
              fontSize: "13px", fontWeight: 600, cursor: "pointer",
              background: "#1f2328", color: "#ffffff",
              opacity: (!data || loading) ? 0.5 : 1, transition: "all 150ms",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>

        {/* Period label */}
        {data && !loading && (
          <p style={{ fontSize: "13px", color: "#656d76", marginBottom: "16px", fontWeight: 500 }}>
            {data.period.label}
          </p>
        )}

        {/* Summary cards */}
        {data && !loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
            {[
              { label: "Total Leads",    value: data.totals.leads,    color: col.leads    },
              { label: "Total Invoices", value: data.totals.invoices, color: col.invoices },
              { label: "Total Units",    value: data.totals.units,    color: col.units    },
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

          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", padding: "11px 20px", background: "#f6f8fa", borderBottom: "1px solid #d0d7de" }}>
            {["Agent", "Leads", "Invoices", "Units"].map((h, i) => (
              <span key={h} style={{ fontSize: "12px", fontWeight: 700, color: "#656d76", textAlign: i > 0 ? "center" : "left" }}>{h}</span>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ padding: "48px", textAlign: "center", color: "#656d76", fontSize: "14px" }}>
              Loading report…
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div style={{ padding: "32px", textAlign: "center", color: "#cf222e", fontSize: "14px" }}>
              {error}
            </div>
          )}

          {/* Rows */}
          {!loading && !error && data && (
            <>
              {data.agents.length === 0 ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#656d76", fontSize: "14px" }}>
                  No activity in this period.
                </div>
              ) : (
                data.agents.map((a, idx) => (
                  <div key={a.userId} style={{
                    display: "grid", gridTemplateColumns: "1fr 120px 120px 120px",
                    padding: "13px 20px",
                    borderBottom: idx < data.agents.length - 1 ? "1px solid #f0f2f4" : "none",
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
                  </div>
                ))
              )}

              {/* Total row */}
              {data.agents.length > 0 && (
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 120px 120px 120px",
                  padding: "13px 20px",
                  background: "#f6f8fa", borderTop: "2px solid #d0d7de",
                }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#1f2328" }}>TOTAL</span>
                  <Pill value={data.totals.leads}    color={col.leads}    bold />
                  <Pill value={data.totals.invoices} color={col.invoices} bold />
                  <Pill value={data.totals.units}    color={col.units}    bold />
                </div>
              )}
            </>
          )}
        </div>
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
