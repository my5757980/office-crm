"use client";

import { useEffect, useState } from "react";

interface Payment {
  _id: string;
  sellingPrice: number;
  amountReceived: number;
  receivedDate: string;
  exchangeRate?: number;
  yenAmount?: number;
  recordedBy?: { name: string };
  createdAt: string;
  unitId?: string;
  receiptImage?: { data: string; filename: string; uploadedAt: string };
}

interface PaymentSectionProps {
  invoiceId: string;
  role: string;
  invoiceCnfPrice?: number;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "1px solid #d0d7de", borderRadius: "8px",
  fontSize: "13px", color: "#1f2328",
  boxSizing: "border-box", outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px", fontWeight: 600,
  color: "#1f2328", display: "block", marginBottom: "4px",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function PaymentSection({ invoiceId, role, invoiceCnfPrice }: PaymentSectionProps) {
  const canAdd = ["admin", "manager", "super_admin"].includes(role);

  const [payments, setPayments]   = useState<Payment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const [lightbox, setLightbox] = useState<{ data: string; filename: string } | null>(null);

  const [form, setForm] = useState({
    sellingPrice:   invoiceCnfPrice?.toString() ?? "",
    amountReceived: "",
    receivedDate:   new Date().toISOString().slice(0, 10),
    exchangeRate:   "",
    yenAmount:      "",
  });
  const [receiptFile, setReceiptFile] = useState<{ data: string; filename: string } | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>("");

  const fetchPayments = async () => {
    setLoading(true);
    const res = await fetch(`/api/payments?invoiceId=${invoiceId}`);
    if (res.ok) {
      const data = await res.json();
      setPayments(data.payments);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, [invoiceId]);

  const totalReceived = payments.reduce((s, p) => s + p.amountReceived, 0);
  const balance       = (invoiceCnfPrice ?? 0) - totalReceived;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setReceiptFile({ data: base64, filename: file.name });
      setReceiptPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setError("");
    const sellingPrice   = parseFloat(form.sellingPrice);
    const amountReceived = parseFloat(form.amountReceived);
    if (!form.receivedDate || isNaN(sellingPrice) || isNaN(amountReceived)) {
      setError("Please fill Selling Price, Amount Received, and Date."); return;
    }
    const body: {
      invoiceId: string;
      sellingPrice: number;
      amountReceived: number;
      receivedDate: string;
      exchangeRate?: number;
      yenAmount?: number;
      receiptImage?: { data: string; filename: string };
    } = { invoiceId, sellingPrice, amountReceived, receivedDate: form.receivedDate };
    if (form.exchangeRate.trim() !== "") body.exchangeRate = parseFloat(form.exchangeRate);
    if (form.yenAmount.trim()    !== "") body.yenAmount    = parseFloat(form.yenAmount);
    if (receiptFile) body.receiptImage = receiptFile;
    setSaving(true);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setReceiptFile(null);
      setReceiptPreview("");
      setForm({ sellingPrice: invoiceCnfPrice?.toString() ?? "", amountReceived: "", receivedDate: new Date().toISOString().slice(0, 10), exchangeRate: "", yenAmount: "" });
      fetchPayments();
    } else {
      const j = await res.json();
      setError(j.error ?? "Failed to save payment");
    }
  };

  const cardStyle: React.CSSProperties = {
    background: "#ffffff", border: "1px solid #d0d7de",
    borderRadius: "10px", overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  };

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{
        padding: "14px 24px", borderBottom: "1px solid #d0d7de",
        background: "linear-gradient(135deg, #f6f8fa 0%, #eff6ff 100%)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#1f2328" }}>
            Payments ({payments.length})
          </p>
          {invoiceCnfPrice && payments.length > 0 && (
            <span style={{
              fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px",
              background: balance <= 0 ? "#d1fae5" : "#fef3c7",
              color: balance <= 0 ? "#065f46" : "#92400e",
            }}>
              {balance <= 0 ? "Fully Paid" : `Balance: $${fmt(balance)}`}
            </span>
          )}
        </div>
        {canAdd && (
          <button
            onClick={() => setShowForm(v => !v)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
              color: "white", background: showForm ? "#6b7280" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
              border: "none", cursor: "pointer", transition: "all 150ms",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {showForm ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}
            </svg>
            {showForm ? "Cancel" : "Add Payment"}
          </button>
        )}
      </div>

      {/* Add Payment Form */}
      {showForm && (
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f2f4", background: "#fafbfc" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Selling Price ($)</label>
              <input name="sellingPrice" type="number" value={form.sellingPrice} onChange={handleChange} placeholder="e.g. 15000" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Amount Received ($)</label>
              <input name="amountReceived" type="number" value={form.amountReceived} onChange={handleChange} placeholder="e.g. 7500" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Received Date</label>
              <input name="receivedDate" type="date" value={form.receivedDate} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Exchange Rate (JPY/USD)</label>
              <input name="exchangeRate" type="number" value={form.exchangeRate} onChange={handleChange} placeholder="e.g. 155" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Yen Amount (¥)</label>
              <input name="yenAmount" type="number" value={form.yenAmount} onChange={handleChange} placeholder="e.g. 1162500" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Receipt Image <span style={{ fontWeight: 400, color: "#8c959f" }}>(optional)</span></label>
              <label style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "9px 12px", border: "1px dashed #d0d7de", borderRadius: "8px",
                fontSize: "13px", color: receiptFile ? "#1f2328" : "#8c959f",
                cursor: "pointer", background: "#fafbfc",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {receiptFile ? receiptFile.filename : "Upload bank receipt…"}
                <input type="file" accept="image/*" onChange={handleReceiptChange} style={{ display: "none" }} />
              </label>
              {receiptPreview && (
                <div style={{ marginTop: "8px", position: "relative", display: "inline-block" }}>
                  <img src={receiptPreview} alt="Receipt preview" style={{ maxHeight: "80px", maxWidth: "100%", borderRadius: "6px", border: "1px solid #d0d7de" }} />
                  <button
                    onClick={() => { setReceiptFile(null); setReceiptPreview(""); }}
                    style={{ position: "absolute", top: "-6px", right: "-6px", width: "18px", height: "18px", borderRadius: "50%", border: "none", background: "#cf222e", color: "white", fontSize: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >✕</button>
                </div>
              )}
            </div>
          </div>
          {error && (
            <div style={{ marginTop: "12px", fontSize: "12px", color: "#cf222e", background: "#ffebe9", padding: "8px 12px", borderRadius: "6px" }}>
              {error}
            </div>
          )}
          <div style={{ marginTop: "14px", display: "flex", gap: "8px" }}>
            <button onClick={() => setShowForm(false)} style={{
              padding: "8px 18px", borderRadius: "8px", border: "1px solid #d0d7de",
              background: "#f6f8fa", color: "#1f2328", fontSize: "13px", fontWeight: 600, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving} style={{
              padding: "8px 18px", borderRadius: "8px", border: "none",
              background: saving ? "#93c5fd" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "white", fontSize: "13px", fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
            }}>
              {saving ? "Saving…" : "Save Payment"}
            </button>
          </div>
        </div>
      )}

      {/* Payment List */}
      {loading ? (
        <div style={{ padding: "32px", textAlign: "center", fontSize: "13px", color: "#8c959f" }}>Loading…</div>
      ) : payments.length === 0 ? (
        <div style={{ padding: "32px", textAlign: "center", fontSize: "13px", color: "#8c959f" }}>
          No payments recorded yet.
        </div>
      ) : (
        <div>
          {/* Summary Row */}
          {invoiceCnfPrice && (
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
              padding: "12px 24px", background: "#f6f8fa", borderBottom: "1px solid #d0d7de", gap: "8px",
            }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "10px", color: "#8c959f", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Invoice Total</p>
                <p style={{ fontSize: "16px", fontWeight: 700, color: "#1f2328" }}>${fmt(invoiceCnfPrice)}</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "10px", color: "#8c959f", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Received</p>
                <p style={{ fontSize: "16px", fontWeight: 700, color: "#059669" }}>${fmt(totalReceived)}</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "10px", color: "#8c959f", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Balance</p>
                <p style={{ fontSize: "16px", fontWeight: 700, color: balance > 0 ? "#d97706" : "#059669" }}>
                  ${fmt(Math.abs(balance))}{balance > 0 ? " due" : " clear"}
                </p>
              </div>
            </div>
          )}

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f6f8fa", borderBottom: "1px solid #d0d7de" }}>
                {["#", "Date", "Selling Price", "Received", "Exchange Rate", "Yen Amount", "Recorded By", "Receipt"].map(h => (
                  <th key={h} style={{ padding: "9px 16px", fontSize: "11px", fontWeight: 700, color: "#656d76", textAlign: "left", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={p._id} style={{ borderBottom: i < payments.length - 1 ? "1px solid #f0f2f4" : "none" }}>
                  <td style={{ padding: "11px 16px", color: "#8c959f", fontWeight: 600 }}>{i + 1}</td>
                  <td style={{ padding: "11px 16px", whiteSpace: "nowrap" }}>
                    {new Date(p.receivedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ padding: "11px 16px", fontWeight: 600, color: "#1f2328" }}>${fmt(p.sellingPrice)}</td>
                  <td style={{ padding: "11px 16px", fontWeight: 700, color: "#059669" }}>${fmt(p.amountReceived)}</td>
                  <td style={{ padding: "11px 16px", color: "#656d76" }}>{p.exchangeRate ?? "—"}</td>
                  <td style={{ padding: "11px 16px", color: "#656d76" }}>{p.yenAmount != null ? `¥${fmt(p.yenAmount)}` : "—"}</td>
                  <td style={{ padding: "11px 16px", color: "#656d76", fontSize: "12px" }}>{p.recordedBy?.name ?? "—"}</td>
                  <td style={{ padding: "11px 16px" }}>
                    {p.receiptImage?.data ? (
                      <img
                        src={p.receiptImage.data}
                        alt="Receipt"
                        onClick={() => setLightbox({ data: p.receiptImage!.data, filename: p.receiptImage!.filename })}
                        style={{ height: "36px", width: "36px", objectFit: "cover", borderRadius: "4px", border: "1px solid #d0d7de", cursor: "pointer" }}
                      />
                    ) : <span style={{ fontSize: "12px", color: "#8c959f" }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* TT Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "24px",
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", maxWidth: "90vw" }}>
            <img
              src={lightbox.data}
              alt={lightbox.filename}
              style={{ maxWidth: "80vw", maxHeight: "80vh", objectFit: "contain", borderRadius: "8px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <a
                href={lightbox.data}
                download={lightbox.filename}
                style={{ padding: "8px 18px", borderRadius: "8px", background: "#2563eb", color: "white", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}
              >
                Download
              </a>
              <button
                onClick={() => setLightbox(null)}
                style={{ padding: "8px 18px", borderRadius: "8px", background: "#f6f8fa", border: "1px solid #d0d7de", color: "#1f2328", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
