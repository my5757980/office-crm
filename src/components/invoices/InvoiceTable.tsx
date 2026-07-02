"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import InvoiceStatusBadge from "./InvoiceStatusBadge";

interface InvoiceRow {
  _id: string;
  status: string;
  unit: string;
  chassisNo: string;
  createdAt: string;
  leadId?: { customerName: string } | null;
  createdBy?: { name: string } | null;
}

interface Props {
  invoices: InvoiceRow[];
  showAgent?: boolean;
  role?: string;
  paidInvoiceIds?: string[];
}

const thStyle: React.CSSProperties = {
  padding: "10px 18px",
  fontSize: "11px", fontWeight: 700,
  color: "#656d76",
  textAlign: "left",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  background: "#f6f8fa",
  borderBottom: "1px solid #d0d7de",
  whiteSpace: "nowrap",
};

export default function InvoiceTable({ invoices, showAgent = false, role, paidInvoiceIds = [] }: Props) {
  const isSupervisor = role === "super_admin";
  const paidSet = useMemo(() => new Set(paidInvoiceIds), [paidInvoiceIds]);

  const [selectedMonth, setSelectedMonth] = useState("");

  const months = useMemo(() => {
    const seen = new Set<string>();
    const result: { value: string; label: string }[] = [];
    invoices.forEach(inv => {
      const d = new Date(inv.createdAt);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({
          value: key,
          label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
        });
      }
    });
    return result;
  }, [invoices]);

  const filtered = useMemo(() => {
    if (!selectedMonth) return invoices;
    return invoices.filter(inv => {
      const d = new Date(inv.createdAt);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      return key === selectedMonth;
    });
  }, [invoices, selectedMonth]);

  return (
    <>
      <div style={{
        padding: "14px 20px",
        borderBottom: "1px solid #f0f2f4",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328" }}>
          Invoice Requests · <span style={{ color: "#656d76", fontWeight: 400 }}>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
        </span>
        {isSupervisor && (
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "#1f2328",
              background: "#f6f8fa",
              border: "1px solid #d0d7de",
              borderRadius: "6px",
              padding: "5px 28px 5px 10px",
              cursor: "pointer",
              outline: "none",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23656d76' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 8px center",
            }}
          >
            <option value="">All Months</option>
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📄</div>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#1f2328" }}>No invoices found</p>
            <p style={{ fontSize: "13px", color: "#8c959f", marginTop: "4px" }}>
              {selectedMonth ? "No invoices in the selected month" : "Invoice requests will appear here"}
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                <th style={thStyle}>Customer</th>
                {showAgent && <th style={thStyle}>Agent</th>}
                <th style={thStyle}>Vehicle</th>
                <th style={thStyle}>Chassis No.</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => {
                const displayStatus =
                  isSupervisor && inv.status === "sent" && paidSet.has(inv._id)
                    ? "payment_received"
                    : inv.status;
                return (
                  <tr
                    key={inv._id}
                    style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f0f2f4" : "none" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f6f8fa"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <td style={{ padding: "13px 18px" }}>
                      <span style={{ fontWeight: 600, color: "#1f2328" }}>{inv.leadId?.customerName ?? "—"}</span>
                    </td>
                    {showAgent && (
                      <td style={{ padding: "13px 18px", color: "#656d76", fontSize: "12px" }}>{inv.createdBy?.name ?? "—"}</td>
                    )}
                    <td style={{ padding: "13px 18px", color: "#1f2328" }}>{inv.unit}</td>
                    <td style={{ padding: "13px 18px" }}>
                      <code style={{
                        fontSize: "11px", fontFamily: "monospace",
                        background: "#f6f8fa", color: "#656d76",
                        border: "1px solid #d0d7de",
                        padding: "2px 8px", borderRadius: "6px",
                      }}>
                        {inv.chassisNo}
                      </code>
                    </td>
                    <td style={{ padding: "13px 18px" }}>
                      <InvoiceStatusBadge status={displayStatus} />
                    </td>
                    <td style={{ padding: "13px 18px", color: "#8c959f", fontSize: "12px", whiteSpace: "nowrap" }}>
                      {new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "right" }}>
                      <Link href={`/invoices/${inv._id}`} style={{
                        fontSize: "12px", fontWeight: 600,
                        color: "#2563eb", background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        padding: "4px 12px", borderRadius: "6px",
                        textDecoration: "none",
                      }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
