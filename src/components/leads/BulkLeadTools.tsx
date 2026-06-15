"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Agent { _id: string; name: string; }
interface CountryCount { country: string; count: number; }

interface Props {
  agents: Agent[];
  unassigned: CountryCount[];
}

interface ImportResult {
  imported: number;
  skipped: { row: number; reason: string }[];
}

const btn = (bg: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: "7px",
  padding: "8px 16px", borderRadius: "8px", border: "none",
  fontSize: "13px", fontWeight: 600, color: "white", background: bg,
  cursor: "pointer",
});

export default function BulkLeadTools({ agents, unassigned }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [assignSel, setAssignSel] = useState<Record<string, string>>({});
  const [assigning, setAssigning] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setError(""); setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/leads/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleAssign = async (country: string) => {
    const userId = assignSel[country];
    if (!userId) return;
    setAssigning(country); setError("");
    try {
      const res = await fetch("/api/leads/reassign-bulk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reassign failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reassign failed");
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div style={{ background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f2f4", background: "linear-gradient(135deg, #f6f8fa 0%, #fef2f2 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#1f2328" }}>Bulk Lead Import</p>
          <p style={{ fontSize: "12px", color: "#8c959f", marginTop: "2px" }}>Download the template, fill it, import — then assign leads to agents by country</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <a href="/api/leads/template" style={{ ...btn("#1f2328"), textDecoration: "none" }}>
            <DownloadIcon /> Download Template
          </a>
          <button onClick={() => fileRef.current?.click()} disabled={importing} style={{ ...btn(importing ? "#6b7280" : "linear-gradient(135deg, #c0272d, #8b1a1e)"), cursor: importing ? "default" : "pointer" }}>
            <UploadIcon /> {importing ? "Importing…" : "Import Excel"}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFile} style={{ display: "none" }} />
        </div>
      </div>

      {error && <div style={{ padding: "12px 20px", color: "#cf222e", fontSize: "13px", background: "#fff5f5" }}>{error}</div>}

      {/* Import result */}
      {result && (
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f2f4" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#059669" }}>
            ✓ {result.imported} lead{result.imported !== 1 ? "s" : ""} imported
            {result.skipped.length > 0 && <span style={{ color: "#d97706" }}> · {result.skipped.length} skipped</span>}
          </p>
          {result.skipped.length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: "18px", fontSize: "12px", color: "#8c959f", maxHeight: "120px", overflowY: "auto" }}>
              {result.skipped.slice(0, 50).map((s, i) => (
                <li key={i}>{s.row > 0 ? `Row ${s.row}: ` : ""}{s.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Unassigned leads by country → assign to agent */}
      {unassigned.length > 0 && (
        <div style={{ padding: "14px 20px" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#8c959f", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
            Unassigned leads — assign by country
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {unassigned.map((c) => (
              <div key={c.country} style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", padding: "8px 12px", borderRadius: "8px", background: "#f6f8fa", border: "1px solid #e5e7eb" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328", minWidth: "140px" }}>
                  {c.country} <span style={{ color: "#8c959f", fontWeight: 400 }}>({c.count})</span>
                </span>
                <select
                  value={assignSel[c.country] ?? ""}
                  onChange={(e) => setAssignSel((p) => ({ ...p, [c.country]: e.target.value }))}
                  style={{ flex: 1, minWidth: "180px", padding: "6px 10px", borderRadius: "6px", border: "1px solid #d0d7de", fontSize: "13px", background: "#fff" }}
                >
                  <option value="">— Select agent —</option>
                  {agents.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
                <button
                  onClick={() => handleAssign(c.country)}
                  disabled={!assignSel[c.country] || assigning === c.country}
                  style={{ ...btn(!assignSel[c.country] ? "#9ca3af" : "linear-gradient(135deg, #059669, #047857)"), cursor: !assignSel[c.country] ? "not-allowed" : "pointer", padding: "6px 14px" }}
                >
                  {assigning === c.country ? "Assigning…" : "Assign"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DownloadIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
}
function UploadIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
}
