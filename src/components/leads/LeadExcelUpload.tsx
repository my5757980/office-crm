"use client";

// An agent's own bulk lead upload: the template, then one Excel file. Every
// lead in it becomes the uploader's, dated with the upload time (/api/leads/import).
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ImportResult {
  imported: number;
  skipped: { row: number; reason: string }[];
  uploadedAt: string;
}

const btn = (bg: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: "7px",
  padding: "8px 16px", borderRadius: "8px", border: "none",
  fontSize: "13px", fontWeight: 600, color: "white", background: bg,
  cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap",
});

export default function LeadExcelUpload() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(""); setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/leads/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setResult(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="lead-upload" style={{ background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", background: "linear-gradient(135deg, #f6f8fa 0%, #eff6ff 100%)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#1f2328" }}>Bulk upload (Excel)</p>
          <p style={{ fontSize: "12px", color: "#8c959f", marginTop: "2px" }}>
            Download the template, fill one lead per row, upload. The leads are yours, dated with the upload time.
          </p>
        </div>
        <div className="bulk-btns" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <a href="/api/leads/template" style={btn("#1f2328")}>
            <DownloadIcon /> Download Template
          </a>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ ...btn(uploading ? "#6b7280" : "linear-gradient(135deg, #2563eb, #1d4ed8)"), cursor: uploading ? "default" : "pointer" }}
          >
            <UploadIcon /> {uploading ? "Uploading…" : "Upload Excel"}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFile} style={{ display: "none" }} />
        </div>
      </div>

      {error && <div role="alert" style={{ padding: "12px 20px", color: "#cf222e", fontSize: "13px", background: "#fff5f5", borderTop: "1px solid #f0f2f4" }}>{error}</div>}

      {result && (
        <div style={{ padding: "14px 20px", borderTop: "1px solid #f0f2f4" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#059669" }}>
            ✓ {result.imported} lead{result.imported !== 1 ? "s" : ""} added
            {result.skipped.length > 0 && <span style={{ color: "#d97706" }}> · {result.skipped.length} skipped</span>}
          </p>
          {result.skipped.length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: "18px", fontSize: "12px", color: "#656d76", maxHeight: "160px", overflowY: "auto" }}>
              {result.skipped.slice(0, 100).map((s, i) => (
                <li key={i}>{s.row > 0 ? `Row ${s.row}: ` : ""}{s.reason}</li>
              ))}
            </ul>
          )}
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
