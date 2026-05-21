"use client";

import { useState, useEffect, useCallback } from "react";

interface FinancialRecord {
  currency: "JPY" | "USD";
  buying: number; domestic: number; storage: number; inspect: number;
  repairs: number; misc: number; agencyFee: number; freight: number; dhl: number;
  exchangeRate: number; costUSD: number;
  costOfUnitJPY: number; costOfUnitUSD: number;
  sellingPrice: number; profit: number;
}

interface Props {
  unitId: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "7px 10px", border: "1px solid #d0d7de",
  borderRadius: "6px", fontSize: "13px", color: "#1f2328",
  background: "#fff", outline: "none", boxSizing: "border-box",
  textAlign: "right",
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 600, color: "#656d76",
  textTransform: "uppercase", letterSpacing: "0.05em",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

const JPY_FIELDS: { key: string; label: string }[] = [
  { key: "buying",    label: "BUYING" },
  { key: "domestic",  label: "DOMESTIC" },
  { key: "storage",   label: "STORAGE" },
  { key: "inspect",   label: "INSPECT" },
  { key: "repairs",   label: "REPAIRS" },
  { key: "misc",      label: "MISC." },
  { key: "agencyFee", label: "AGENCY FEE" },
  { key: "freight",   label: "FREIGHT" },
  { key: "dhl",       label: "DHL" },
];

function emptyJPY() {
  return { buying: "", domestic: "", storage: "", inspect: "", repairs: "", misc: "", agencyFee: "", freight: "", dhl: "", exchangeRate: "" };
}

export default function UnitFinancial({ unitId }: Props) {
  const [currency, setCurrency] = useState<"JPY" | "USD">("JPY");
  const [jpyFields, setJpyFields] = useState<Record<string, string>>(emptyJPY());
  const [usdCost, setUsdCost] = useState("");
  const [sellingPrice, setSellingPrice] = useState(0);
  const [saved, setSaved] = useState<FinancialRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/units/${unitId}/financial`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSellingPrice(data.sellingPrice ?? 0);
      if (data.financial) {
        const f: FinancialRecord = data.financial;
        setSaved(f);
        setCurrency(f.currency);
        if (f.currency === "JPY") {
          setJpyFields({
            buying: f.buying ? String(f.buying) : "",
            domestic: f.domestic ? String(f.domestic) : "",
            storage: f.storage ? String(f.storage) : "",
            inspect: f.inspect ? String(f.inspect) : "",
            repairs: f.repairs ? String(f.repairs) : "",
            misc: f.misc ? String(f.misc) : "",
            agencyFee: f.agencyFee ? String(f.agencyFee) : "",
            freight: f.freight ? String(f.freight) : "",
            dhl: f.dhl ? String(f.dhl) : "",
            exchangeRate: f.exchangeRate ? String(f.exchangeRate) : "",
          });
        } else {
          setUsdCost(f.costUSD ? String(f.costUSD) : "");
        }
      }
    } catch {
      setError("Failed to load financial data");
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => { load(); }, [load]);

  // Live calculations
  const jpyTotal = JPY_FIELDS.reduce((sum, f) => sum + (parseFloat(jpyFields[f.key]) || 0), 0);
  const exRate   = parseFloat(jpyFields.exchangeRate) || 0;
  const jpyCostUSD = exRate > 0 ? jpyTotal / exRate : 0;
  const usdCostNum = parseFloat(usdCost) || 0;
  const liveCostUSD = currency === "JPY" ? jpyCostUSD : usdCostNum;
  const liveProfit  = sellingPrice - liveCostUSD;

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const body = currency === "JPY"
        ? { currency, ...Object.fromEntries(JPY_FIELDS.map(f => [f.key, parseFloat(jpyFields[f.key]) || 0])), exchangeRate: parseFloat(jpyFields.exchangeRate) || 0 }
        : { currency, costUSD: usdCostNum };

      const res = await fetch(`/api/units/${unitId}/financial`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSaved(data.financial);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    background: "#fff", borderRadius: "12px",
    border: "1px solid #d0d7de", overflow: "hidden",
  };

  if (loading) return (
    <div style={{ ...cardStyle, padding: "24px", textAlign: "center", color: "#8c959f", fontSize: "13px" }}>
      Loading financial data…
    </div>
  );

  const profitColor = liveProfit >= 0 ? "#059669" : "#dc2626";
  const savedProfitColor = saved && saved.profit >= 0 ? "#059669" : "#dc2626";

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
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#1f2328" }}>Financial / Profit</p>
          {saved && (
            <span style={{
              fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px",
              background: saved.profit >= 0 ? "#d1fae5" : "#fee2e2",
              color: savedProfitColor,
            }}>
              {saved.profit >= 0 ? `Profit: $${fmt(saved.profit)}` : `Loss: $${fmt(Math.abs(saved.profit))}`}
            </span>
          )}
        </div>

        {/* Currency Toggle */}
        <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "1px solid #d0d7de" }}>
          {(["JPY", "USD"] as const).map(c => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              style={{
                padding: "5px 16px", fontSize: "12px", fontWeight: 700,
                border: "none", cursor: "pointer", transition: "all 150ms",
                background: currency === c ? "#2563eb" : "#f6f8fa",
                color: currency === c ? "#fff" : "#656d76",
              }}
            >
              {c === "JPY" ? "¥ JPY" : "$ USD"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Selling Price (read-only) */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#f6f8fa", borderRadius: "8px", padding: "12px 16px",
          border: "1px solid #d0d7de",
        }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#656d76", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Selling Price (CNF)
          </span>
          <span style={{ fontSize: "18px", fontWeight: 800, color: "#1f2328" }}>
            ${fmt(sellingPrice)}
          </span>
        </div>

        {/* JPY Mode */}
        {currency === "JPY" && (
          <>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#8c959f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                Cost Breakdown (JPY ¥)
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                {JPY_FIELDS.map(f => (
                  <div key={f.key}>
                    <p style={labelStyle}>{f.label}</p>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #d0d7de", borderRadius: "6px", overflow: "hidden", marginTop: "4px" }}>
                      <span style={{ padding: "7px 8px", fontSize: "12px", color: "#8c959f", background: "#f6f8fa", borderRight: "1px solid #d0d7de" }}>¥</span>
                      <input
                        type="number"
                        min="0"
                        value={jpyFields[f.key]}
                        onChange={e => setJpyFields(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder="0"
                        style={{ ...inputStyle, border: "none", borderRadius: 0, flex: 1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost of Unit (JPY) */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "#1e3a5f", borderRadius: "8px", padding: "12px 16px",
            }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#93c5fd", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Cost of the Unit (Total JPY)
              </span>
              <span style={{ fontSize: "18px", fontWeight: 800, color: "#fff" }}>
                ¥{fmtInt(jpyTotal)}
              </span>
            </div>

            {/* Exchange Rate */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", alignItems: "end" }}>
              <div>
                <p style={labelStyle}>Exchange Rate <span style={{ color: "#8c959f", fontSize: "10px", fontWeight: 400 }}>(1 USD = ? JPY)</span></p>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid #d0d7de", borderRadius: "6px", overflow: "hidden", marginTop: "4px" }}>
                  <span style={{ padding: "7px 8px", fontSize: "12px", color: "#8c959f", background: "#f6f8fa", borderRight: "1px solid #d0d7de" }}>1$=</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={jpyFields.exchangeRate}
                    onChange={e => setJpyFields(p => ({ ...p, exchangeRate: e.target.value }))}
                    placeholder="e.g. 150"
                    style={{ ...inputStyle, border: "none", borderRadius: 0, flex: 1 }}
                  />
                  <span style={{ padding: "7px 8px", fontSize: "12px", color: "#8c959f", background: "#f6f8fa", borderLeft: "1px solid #d0d7de" }}>¥</span>
                </div>
              </div>
              <div style={{
                background: "#f0fdf4", borderRadius: "8px", padding: "10px 14px",
                border: "1px solid #bbf7d0",
              }}>
                <p style={{ fontSize: "10px", color: "#059669", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Cost in USD</p>
                <p style={{ fontSize: "18px", fontWeight: 800, color: "#065f46" }}>${fmt(jpyCostUSD)}</p>
              </div>
            </div>
          </>
        )}

        {/* USD Mode */}
        {currency === "USD" && (
          <div>
            <p style={labelStyle}>Cost of the Unit (USD)</p>
            <div style={{ display: "flex", alignItems: "center", border: "1px solid #d0d7de", borderRadius: "6px", overflow: "hidden", marginTop: "4px", maxWidth: "280px" }}>
              <span style={{ padding: "9px 10px", fontSize: "13px", color: "#8c959f", background: "#f6f8fa", borderRight: "1px solid #d0d7de" }}>$</span>
              <input
                type="number" min="0" step="0.01"
                value={usdCost}
                onChange={e => setUsdCost(e.target.value)}
                placeholder="0.00"
                style={{ ...inputStyle, border: "none", borderRadius: 0, flex: 1 }}
              />
            </div>
          </div>
        )}

        {/* Profit Summary */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: "10px", borderTop: "1px solid #f0f2f4", paddingTop: "16px",
        }}>
          <div style={{ textAlign: "center", background: "#f6f8fa", borderRadius: "8px", padding: "12px" }}>
            <p style={{ fontSize: "10px", color: "#8c959f", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Selling Price</p>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#1f2328" }}>${fmt(sellingPrice)}</p>
          </div>
          <div style={{ textAlign: "center", background: "#fef9f0", borderRadius: "8px", padding: "12px" }}>
            <p style={{ fontSize: "10px", color: "#d97706", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Cost (USD)</p>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#92400e" }}>${fmt(liveCostUSD)}</p>
          </div>
          <div style={{
            textAlign: "center", borderRadius: "8px", padding: "12px",
            background: liveProfit >= 0 ? "#f0fdf4" : "#fef2f2",
          }}>
            <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: liveProfit >= 0 ? "#059669" : "#dc2626" }}>
              {liveProfit >= 0 ? "Profit" : "Loss"}
            </p>
            <p style={{ fontSize: "18px", fontWeight: 800, color: profitColor }}>
              ${fmt(Math.abs(liveProfit))}
            </p>
          </div>
        </div>

        {error && <p style={{ fontSize: "12px", color: "#dc2626", textAlign: "center" }}>{error}</p>}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%", padding: "10px", borderRadius: "8px", border: "none",
            fontSize: "13px", fontWeight: 700, color: "#fff",
            background: saving ? "#6b7280" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
            boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
          }}
        >
          {saving ? "Saving…" : saved ? "Update Financial Record" : "Save Financial Record"}
        </button>
      </div>
    </div>
  );
}
