"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InvoiceStatusBadge from "./InvoiceStatusBadge";

interface InvoiceDetailProps {
  invoice: {
    _id: string;
    status: string;
    rejectionNote?: string;
    unit: string;
    year?: string;
    chassisNo: string;
    engineNo: string;
    color: string;
    m3Rate: number;
    exchangeRate: number;
    pushPrice: number;
    cnfPrice: number;
    createdAt: string;
    consignee: { name: string; address: string; phone: string; country: string; port: string };
    leadId?: { customerName: string; contactPerson: string } | null;
    createdBy?: { name: string; email: string } | null;
    approvedBy?: { name: string } | null;
    uploadedPdf?: { data: string; filename: string; uploadedAt: string } | null;
  };
  role: string;
}

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", gap: "12px", padding: "9px 0", borderBottom: "1px solid #f0f2f4" }}>
      <span style={{ fontSize: "11px", color: "#8c959f", fontWeight: 500, width: "110px", flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ fontSize: "13px", color: "#1f2328", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default function InvoiceDetail({ invoice, role }: InvoiceDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const [dlLoading, setDlLoading] = useState<"sbk" | "jdm" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState(invoice.uploadedPdf ?? null);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("pdf", file);
    const res = await fetch(`/api/invoices/${invoice._id}/upload`, { method: "POST", body: form });
    const json = await res.json();
    if (res.ok) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        setUploadedPdf({ data: base64, filename: file.name, uploadedAt: new Date().toISOString() });
      };
      reader.readAsDataURL(file);
    } else {
      alert(json.error ?? "Upload failed");
    }
    setUploading(false);
  };

  const downloadInvoice = async (type: "sbk" | "jdm") => {
    setDlLoading(type);
    try {
      const res = await fetch(`/api/invoices/${invoice._id}/download/${type}`);
      if (!res.ok) { alert("Download failed"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = type === "sbk"
        ? `SBK-Invoice-${invoice._id.slice(-5).toUpperCase()}.docx`
        : `JDM-Invoice-${invoice._id.slice(-5).toUpperCase()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setDlLoading(null); }
  };

  const patch = async (action: string, extra?: Record<string, string>) => {
    setLoading(true);
    const res = await fetch(`/api/invoices/${invoice._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    if (res.ok) { router.refresh(); }
    else { const j = await res.json(); alert(j.error ?? "Action failed"); }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this invoice? The lead will revert to in-progress.")) return;
    setLoading(true);
    const res = await fetch(`/api/invoices/${invoice._id}`, { method: "DELETE" });
    if (res.ok) { router.push("/invoices"); router.refresh(); }
    else { const j = await res.json(); alert(j.error ?? "Delete failed"); setLoading(false); }
  };

  const handleReject = async () => {
    await patch("reject", { rejectionNote: rejectNote });
    setRejectModal(false);
    setRejectNote("");
  };

  const cardStyle: React.CSSProperties = {
    background: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header card */}
      <div style={cardStyle}>
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid #d0d7de",
          background: "linear-gradient(135deg, #f6f8fa 0%, #eff6ff 100%)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px",
        }} className="no-print">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "10px", flexShrink: 0,
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1f2328" }}>
                {invoice.leadId?.customerName ?? "Invoice"}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px", flexWrap: "wrap" }}>
                <InvoiceStatusBadge status={invoice.status} />
                <span style={{ fontSize: "12px", color: "#8c959f" }}>
                  {new Date(invoice.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                {invoice.createdBy && (
                  <span style={{ fontSize: "12px", color: "#8c959f" }}>
                    by <strong style={{ color: "#656d76" }}>{invoice.createdBy.name}</strong>
                  </span>
                )}
                {invoice.approvedBy && (
                  <span style={{ fontSize: "12px", color: "#065f46", fontWeight: 600 }}>
                    ✓ Approved by {invoice.approvedBy.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
            <button
              onClick={() => window.print()}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "7px 14px", borderRadius: "8px",
                fontSize: "13px", fontWeight: 600,
                color: "#656d76", background: "#ffffff",
                border: "1px solid #d0d7de", cursor: "pointer",
                transition: "all 150ms",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print
            </button>

            {role === "super_admin" && ["approved", "sent"].includes(invoice.status) && (
              <>
                <button
                  onClick={() => downloadInvoice("sbk")}
                  disabled={dlLoading !== null}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "7px 14px", borderRadius: "8px",
                    fontSize: "13px", fontWeight: 600,
                    color: "white", background: "linear-gradient(135deg, #c0272d, #8b1a1e)",
                    border: "none", cursor: dlLoading ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(192,39,45,0.3)",
                    opacity: dlLoading ? 0.7 : 1,
                    transition: "all 150ms",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/>
                  </svg>
                  {dlLoading === "sbk" ? "Generating…" : "SBK Invoice (Word)"}
                </button>

                <button
                  onClick={() => downloadInvoice("jdm")}
                  disabled={dlLoading !== null}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "7px 14px", borderRadius: "8px",
                    fontSize: "13px", fontWeight: 600,
                    color: "white", background: "linear-gradient(135deg, #1d6f42, #155d36)",
                    border: "none", cursor: dlLoading ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(29,111,66,0.3)",
                    opacity: dlLoading ? 0.7 : 1,
                    transition: "all 150ms",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/>
                    <line x1="15" y1="3" x2="15" y2="21"/>
                  </svg>
                  {dlLoading === "jdm" ? "Generating…" : "JDM Invoice (Excel)"}
                </button>
              </>
            )}

            {role === "super_admin" && invoice.status === "pending" && (
              <>
                <button
                  onClick={() => patch("approve")}
                  disabled={loading}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "7px 14px", borderRadius: "8px",
                    fontSize: "13px", fontWeight: 600,
                    color: "white", background: "linear-gradient(135deg, #059669, #047857)",
                    border: "none", cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(5,150,105,0.3)",
                    opacity: loading ? 0.6 : 1,
                    transition: "all 150ms",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Approve
                </button>
                <button
                  onClick={() => setRejectModal(true)}
                  disabled={loading}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "7px 14px", borderRadius: "8px",
                    fontSize: "13px", fontWeight: 600,
                    color: "#cf222e", background: "#ffebe9",
                    border: "1px solid #ffcecb", cursor: "pointer",
                    opacity: loading ? 0.6 : 1,
                    transition: "all 150ms",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Reject
                </button>
              </>
            )}

            {role === "super_admin" && invoice.status === "approved" && uploadedPdf && (
              <button
                onClick={() => patch("mark_sent")}
                disabled={loading}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "7px 14px", borderRadius: "8px",
                  fontSize: "13px", fontWeight: 600,
                  color: "white", background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  border: "none", cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                  opacity: loading ? 0.6 : 1,
                  transition: "all 150ms",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Mark as Sent
              </button>
            )}

            {["admin", "manager"].includes(role) && (
              <button
                onClick={handleDelete}
                disabled={loading}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "7px 14px", borderRadius: "8px",
                  fontSize: "13px", fontWeight: 600,
                  color: "#cf222e", background: "#ffebe9",
                  border: "1px solid #ffcecb", cursor: "pointer",
                  opacity: loading ? 0.6 : 1,
                  transition: "all 150ms",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Rejection notice */}
        {invoice.status === "rejected" && invoice.rejectionNote && (
          <div style={{
            margin: "16px 24px",
            display: "flex", alignItems: "flex-start", gap: "10px",
            background: "#ffebe9", border: "1px solid #ffcecb",
            color: "#cf222e", borderRadius: "8px",
            padding: "12px 16px", fontSize: "13px",
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div><strong>Rejection reason: </strong>{invoice.rejectionNote}</div>
          </div>
        )}

        {/* Print-only header */}
        <div className="hidden print:block" style={{ textAlign: "center", padding: "24px", borderBottom: "1px solid #d0d7de" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#1f2328" }}>INVOICE</h1>
          <p style={{ color: "#656d76", fontSize: "13px", marginTop: "6px" }}>
            Customer: {invoice.leadId?.customerName} · Date: {new Date(invoice.createdAt).toLocaleDateString()} · Status: {invoice.status.toUpperCase()}
          </p>
        </div>

        {/* Consignee + Vehicle grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ padding: "20px 24px", borderRight: "1px solid #f0f2f4" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#8c959f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Consignee</p>
            <InfoRow label="Name"    value={invoice.consignee.name} />
            <InfoRow label="Phone"   value={invoice.consignee.phone} />
            <InfoRow label="Country" value={invoice.consignee.country} />
            <InfoRow label="Port"    value={invoice.consignee.port} />
            <InfoRow label="Address" value={invoice.consignee.address} />
          </div>
          <div style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#8c959f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Vehicle Details</p>
            <InfoRow label="Unit / Make" value={invoice.unit} />
            <InfoRow label="Color"       value={invoice.color} />
            <InfoRow label="Chassis No." value={invoice.chassisNo} />
            <InfoRow label="Engine No."  value={invoice.engineNo} />
          </div>
        </div>
      </div>

      {/* Pricing card */}
      <div style={cardStyle}>
        <div style={{
          padding: "14px 24px",
          borderBottom: "1px solid #d0d7de",
          background: "linear-gradient(135deg, #f6f8fa 0%, #eff6ff 100%)",
        }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#1f2328" }}>Pricing Breakdown</p>
        </div>
        <div>
          {[
            { label: "M3 Rate",       sub: "Cubic meter rate",         value: invoice.m3Rate },
            { label: "Exchange Rate", sub: "Currency conversion",      value: invoice.exchangeRate },
            { label: "Push Price",    sub: "Buying price",             value: invoice.pushPrice },
            { label: "CNF Price",     sub: "Cost & Freight (selling)", value: invoice.cnfPrice },
          ].map(({ label, sub, value }, i, arr) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 24px",
              borderBottom: i < arr.length - 1 ? "1px solid #f0f2f4" : "none",
            }}>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328" }}>{label}</p>
                <p style={{ fontSize: "11px", color: "#8c959f", marginTop: "2px" }}>{sub}</p>
              </div>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#1f2328" }}>{value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PDF Upload + Preview (supervisor: approved/sent | agent: sent) */}
      {(["approved", "sent"].includes(invoice.status)) && (role === "super_admin" || (role === "user" && invoice.status === "sent")) && (
        <div style={cardStyle}>
          <div style={{
            padding: "14px 24px", borderBottom: "1px solid #d0d7de",
            background: "linear-gradient(135deg, #f6f8fa 0%, #eff6ff 100%)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#1f2328" }}>
              {uploadedPdf ? "Invoice PDF" : "Upload Invoice PDF"}
            </p>
            {role === "super_admin" && !uploadedPdf && (
              <span style={{ fontSize: "12px", color: "#8c959f" }}>Upload PDF to enable Mark as Sent</span>
            )}
            {uploadedPdf && (
              <span style={{ fontSize: "12px", color: "#059669", fontWeight: 600 }}>
                ✓ {uploadedPdf.filename}
              </span>
            )}
          </div>

          {/* Upload button — supervisor only */}
          {role === "super_admin" && (
            <div style={{ padding: "16px 24px", borderBottom: uploadedPdf ? "1px solid #f0f2f4" : "none" }}>
              <label style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                color: uploading ? "#8c959f" : "#2563eb",
                background: uploading ? "#f6f8fa" : "#eff6ff",
                border: `1px solid ${uploading ? "#d0d7de" : "#bfdbfe"}`,
                cursor: uploading ? "not-allowed" : "pointer",
                transition: "all 150ms",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {uploading ? "Uploading…" : uploadedPdf ? "Replace PDF" : "Upload PDF"}
                <input
                  type="file" accept="application/pdf"
                  onChange={handlePdfUpload}
                  disabled={uploading}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          )}

          {/* PDF Preview */}
          {uploadedPdf && (
            <div style={{ padding: "0" }}>
              <iframe
                src={`data:application/pdf;base64,${uploadedPdf.data}`}
                style={{ width: "100%", height: "600px", border: "none", display: "block" }}
                title="Invoice PDF"
              />
            </div>
          )}

          {/* No PDF yet message for agent */}
          {!uploadedPdf && role === "user" && (
            <div style={{ padding: "32px 24px", textAlign: "center", color: "#8c959f", fontSize: "13px" }}>
              Invoice PDF not uploaded yet.
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="no-print" style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 50,
        }}>
          <div style={{
            background: "#ffffff",
            border: "1px solid #d0d7de",
            borderRadius: "12px",
            padding: "24px",
            width: "100%", maxWidth: "420px",
            margin: "0 16px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1f2328", marginBottom: "4px" }}>Reject Invoice</h3>
            <p style={{ fontSize: "13px", color: "#656d76", marginBottom: "16px" }}>Optionally provide a reason for rejection.</p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reason for rejection (optional)…"
              style={{
                width: "100%", height: "100px",
                border: "1px solid #d0d7de", borderRadius: "8px",
                padding: "10px 14px", fontSize: "13px", color: "#1f2328",
                resize: "none", outline: "none",
                fontFamily: "inherit", boxSizing: "border-box",
              }}
              onFocus={e => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)"; }}
              onBlur={e => { e.target.style.borderColor = "#d0d7de"; e.target.style.boxShadow = "none"; }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
              <button
                onClick={() => { setRejectModal(false); setRejectNote(""); }}
                style={{
                  padding: "8px 16px", borderRadius: "8px",
                  fontSize: "13px", fontWeight: 600,
                  color: "#656d76", background: "#f6f8fa",
                  border: "1px solid #d0d7de", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                style={{
                  padding: "8px 18px", borderRadius: "8px",
                  fontSize: "13px", fontWeight: 600,
                  color: "white", background: "#cf222e",
                  border: "none", cursor: "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
