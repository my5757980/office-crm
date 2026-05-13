"use client";

import { useRouter } from "next/navigation";

interface PopulatedLead {
  _id: string;
  customerName: string;
  contactPerson: string;
  country: string;
  port: string;
  status: string;
  createdBy: { name: string; email: string };
  createdAt: string;
}

const statusMap: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  new:               { label: "New",               bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  in_progress:       { label: "In Progress",       bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
  closed:            { label: "Closed",            bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" },
  invoice_requested: { label: "Invoice Requested", bg: "#ede9fe", color: "#5b21b6", dot: "#8b5cf6" },
  invoiced:          { label: "Invoiced",          bg: "#d1fae5", color: "#065f46", dot: "#10b981" },
};

export default function LeadTable({ leads, showCreatedBy = false }: { leads: PopulatedLead[]; showCreatedBy?: boolean }) {
  const router = useRouter();

  if (leads.length === 0) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>📋</div>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#1f2328" }}>No leads found</p>
        <p style={{ fontSize: "13px", color: "#8c959f", marginTop: "4px" }}>Create your first lead to get started</p>
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
            <th style={thStyle}>Status</th>
            {showCreatedBy && <th style={thStyle}>Agent</th>}
            <th style={thStyle}>Date</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead, i) => {
            const s = statusMap[lead.status];
            return (
              <tr
                key={lead._id}
                onClick={() => router.push(`/leads/${lead._id}`)}
                style={{
                  cursor: "pointer",
                  borderBottom: i < leads.length - 1 ? "1px solid #f0f2f4" : "none",
                  transition: "background 120ms",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f6f8fa"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <td style={{ padding: "13px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg, #2563eb22, #7c3aed22)",
                      border: "1px solid #d0d7de",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", fontWeight: 700, color: "#2563eb",
                    }}>
                      {lead.customerName[0]}
                    </div>
                    <span style={{ fontWeight: 600, color: "#1f2328" }}>{lead.customerName}</span>
                  </div>
                </td>
                <td style={{ padding: "13px 18px", color: "#656d76" }}>{lead.contactPerson}</td>
                <td style={{ padding: "13px 18px" }}>
                  <span style={{ color: "#1f2328", fontWeight: 500 }}>{lead.country}</span>
                  <br />
                  <span style={{ fontSize: "12px", color: "#8c959f" }}>{lead.port}</span>
                </td>
                <td style={{ padding: "13px 18px" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "5px",
                    padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
                    background: s?.bg ?? "#f3f4f6", color: s?.color ?? "#374151",
                  }}>
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: s?.dot ?? "#9ca3af", flexShrink: 0 }} />
                    {s?.label ?? lead.status}
                  </span>
                </td>
                {showCreatedBy && (
                  <td style={{ padding: "13px 18px", color: "#656d76", fontSize: "12px" }}>{lead.createdBy?.name}</td>
                )}
                <td style={{ padding: "13px 18px", color: "#8c959f", fontSize: "12px", whiteSpace: "nowrap" }}>
                  {new Date(lead.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
