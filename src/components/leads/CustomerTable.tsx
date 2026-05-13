"use client";

import { useRouter } from "next/navigation";

interface Customer {
  _id: string;
  customerName: string;
  contactPerson: string;
  country: string;
  port: string;
  status: string;
  createdBy: { name: string; email: string };
  createdAt: string;
}

export default function CustomerTable({
  customers,
  invoiceCounts,
  showCreatedBy = false,
}: {
  customers: Customer[];
  invoiceCounts: Record<string, { total: number; pending: number }>;
  showCreatedBy?: boolean;
}) {
  const router = useRouter();

  if (customers.length === 0) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>🏢</div>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#1f2328" }}>No customers yet</p>
        <p style={{ fontSize: "13px", color: "#8c959f", marginTop: "4px" }}>Customers appear here when an invoice is requested for a lead</p>
      </div>
    );
  }

  const thStyle: React.CSSProperties = {
    padding: "10px 18px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#656d76",
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    background: "#f6f8fa",
    borderBottom: "1px solid #d0d7de",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr>
            <th style={thStyle}>Customer</th>
            <th style={thStyle}>Contact</th>
            <th style={thStyle}>Destination</th>
            <th style={thStyle}>Invoices</th>
            {showCreatedBy && <th style={thStyle}>Agent</th>}
            <th style={thStyle}>Since</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c, i) => {
            const inv = invoiceCounts[c._id] ?? { total: 0, pending: 0 };
            return (
              <tr
                key={c._id}
                onClick={() => router.push(`/leads/${c._id}`)}
                style={{
                  cursor: "pointer",
                  borderBottom: i < customers.length - 1 ? "1px solid #f0f2f4" : "none",
                  transition: "background 120ms",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f6f8fa"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <td style={{ padding: "13px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg, #05966922, #04785722)",
                      border: "1px solid #a7f3d0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", fontWeight: 700, color: "#059669",
                    }}>
                      {c.customerName[0]}
                    </div>
                    <span style={{ fontWeight: 600, color: "#1f2328" }}>{c.customerName}</span>
                  </div>
                </td>
                <td style={{ padding: "13px 18px", color: "#656d76" }}>{c.contactPerson}</td>
                <td style={{ padding: "13px 18px" }}>
                  <span style={{ color: "#1f2328", fontWeight: 500 }}>{c.country}</span>
                  <br />
                  <span style={{ fontSize: "12px", color: "#8c959f" }}>{c.port}</span>
                </td>
                <td style={{ padding: "13px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
                      background: "#eff6ff", color: "#1d4ed8",
                    }}>
                      {inv.total} total
                    </span>
                    {inv.pending > 0 && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "4px",
                        padding: "3px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
                        background: "#fffbeb", color: "#92400e",
                      }}>
                        {inv.pending} pending
                      </span>
                    )}
                  </div>
                </td>
                {showCreatedBy && (
                  <td style={{ padding: "13px 18px", color: "#656d76", fontSize: "12px" }}>{c.createdBy?.name}</td>
                )}
                <td style={{ padding: "13px 18px", color: "#8c959f", fontSize: "12px", whiteSpace: "nowrap" }}>
                  {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
