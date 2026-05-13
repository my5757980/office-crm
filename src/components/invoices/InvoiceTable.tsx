"use client";

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

export default function InvoiceTable({ invoices, showAgent = false }: Props) {
  if (invoices.length === 0) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>📄</div>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#1f2328" }}>No invoices yet</p>
        <p style={{ fontSize: "13px", color: "#8c959f", marginTop: "4px" }}>Invoice requests will appear here</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
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
          {invoices.map((inv, i) => (
            <tr
              key={inv._id}
              style={{ borderBottom: i < invoices.length - 1 ? "1px solid #f0f2f4" : "none" }}
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
                <InvoiceStatusBadge status={inv.status} />
              </td>
              <td style={{ padding: "13px 18px", color: "#8c959f", fontSize: "12px", whiteSpace: "nowrap" }}>
                {new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
