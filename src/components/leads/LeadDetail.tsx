"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LeadDetailProps {
  lead: {
    _id: string;
    customerName: string;
    contactPerson: string;
    address?: string;
    phone: string;
    email?: string;
    country: string;
    countryCode: string;
    port: string;
    status: string;
    isCustomer?: boolean;
    createdBy: { _id: string; name: string };
    createdAt: string;
  };
  canEdit: boolean;
  canChangeStatus?: boolean;
  canDelete: boolean;
  canRequestInvoice?: boolean;
  canReassign?: boolean;
  agents?: { _id: string; name: string; email: string }[];
}

const statusMap: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  new:               { label: "New",               bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  in_progress:       { label: "In Progress",       bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
  closed:            { label: "Closed",            bg: "#f3f4f6", color: "#374151", dot: "#9ca3af" },
  invoice_requested: { label: "Invoice Requested", bg: "#ede9fe", color: "#5b21b6", dot: "#8b5cf6" },
  invoiced:          { label: "Invoiced",          bg: "#d1fae5", color: "#065f46", dot: "#10b981" },
};

function DataRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: "1px solid #f0f2f4" }}>
      <span style={{ fontSize: "12px", color: "#8c959f", fontWeight: 500, width: "120px", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: "13px", color: "#1f2328", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default function LeadDetail({ lead, canEdit, canChangeStatus, canDelete, canRequestInvoice, canReassign, agents = [] }: LeadDetailProps) {
  const router = useRouter();
  const [deleting, setDeleting]           = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [reassigning, setReassigning]     = useState(false);
  const s = statusMap[lead.status];

  const handleReassign = async (agentId: string) => {
    if (!agentId) return;
    const isSameOwner = agentId === lead.createdBy._id;
    const msg = isSameOwner
      ? `Lead "${lead.contactPerson}" ${lead.createdBy.name} ke paas hi rakhni hai?`
      : `Lead "${lead.contactPerson}" reassign karna chahte ho?`;
    if (!confirm(msg)) return;
    setReassigning(true);
    const res = await fetch(`/api/leads/${lead._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reassignTo: agentId }),
    });
    if (res.ok) { router.refresh(); }
    else { const j = await res.json(); alert(j.error ?? "Reassign failed"); }
    setReassigning(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatusLoading(true);
    const res = await fetch(`/api/leads/${lead._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { router.refresh(); }
    else { const j = await res.json(); alert(j.error ?? "Failed"); }
    setStatusLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${lead.customerName}"? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/leads/${lead._id}`, { method: "DELETE" });
    if (res.ok) { router.push("/dashboard"); router.refresh(); }
    else { alert("Delete failed."); setDeleting(false); }
  };

  return (
    <div style={{ background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #d0d7de", background: "linear-gradient(135deg, #f6f8fa 0%, #eff6ff 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "10px", flexShrink: 0,
            background: lead.isCustomer
              ? "linear-gradient(135deg, #059669, #047857)"
              : "linear-gradient(135deg, #2563eb, #1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "18px", fontWeight: 700, color: "white",
            boxShadow: lead.isCustomer
              ? "0 4px 12px rgba(5,150,105,0.3)"
              : "0 4px 12px rgba(37,99,235,0.3)",
          }}>
            {lead.customerName[0]}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1f2328" }}>{lead.customerName}</h2>
              {lead.isCustomer && (
                <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: "#d1fae5", color: "#065f46", letterSpacing: "0.05em" }}>
                  CUSTOMER
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: s?.bg, color: s?.color }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: s?.dot }} />
                {s?.label ?? lead.status}
              </span>
              <span style={{ fontSize: "12px", color: "#8c959f" }}>
                Added by <strong style={{ color: "#656d76" }}>{lead.createdBy?.name}</strong> · {new Date(lead.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
          {canChangeStatus && !["invoiced", "invoice_requested"].includes(lead.status) && (
            <select
              value={lead.status}
              disabled={statusLoading}
              onChange={e => handleStatusChange(e.target.value)}
              style={{
                padding: "7px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                border: "1px solid #d0d7de", background: "#ffffff", color: "#1f2328",
                cursor: "pointer", outline: "none",
              }}
            >
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
          )}
          {canRequestInvoice && (lead.isCustomer || lead.status !== "closed") && (
            <Link href={`/invoices/request?leadId=${lead._id}`} style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
              color: "white", background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              textDecoration: "none", boxShadow: "0 2px 8px rgba(37,99,235,0.3)", transition: "all 150ms",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              {lead.isCustomer ? "Request New Invoice" : "Request Invoice"}
            </Link>
          )}
          {canReassign && agents.length > 0 && (
            <select
              defaultValue=""
              disabled={reassigning}
              onChange={e => handleReassign(e.target.value)}
              style={{
                padding: "7px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                border: "1px solid #d0d7de", background: "#ffffff", color: "#1f2328",
                cursor: "pointer", outline: "none",
              }}
            >
              <option value="" disabled>Reassign to…</option>
              {agents.map(a => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          )}
          {canEdit && (
            <Link href={`/leads/${lead._id}/edit`} style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
              color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe",
              textDecoration: "none", transition: "all 150ms",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              Edit
            </Link>
          )}
          {canDelete && (
            <button onClick={handleDelete} disabled={deleting} style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
              color: "#cf222e", background: "#ffebe9", border: "1px solid #ffcecb",
              cursor: "pointer", transition: "all 150ms", opacity: deleting ? 0.6 : 1,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ padding: "20px 24px", borderRight: "1px solid #f0f2f4" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#8c959f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Contact Information</p>
          <DataRow label="Contact Person" value={lead.contactPerson} />
          <DataRow label="Phone"          value={lead.phone} />
          <DataRow label="Email"          value={lead.email} />
          <DataRow label="Address"        value={lead.address} />
        </div>
        <div style={{ padding: "20px 24px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#8c959f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Shipping Destination</p>
          <DataRow label="Country"     value={`${lead.country} (${lead.countryCode})`} />
          <DataRow label="Port"        value={lead.port} />
        </div>
      </div>
    </div>
  );
}
