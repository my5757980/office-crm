"use client";

import { useState } from "react";

interface Props {
  unitId: string;
  chassis: string;
  /** "button" = full labelled button (detail page); "icon" = compact (list row) */
  variant?: "button" | "icon";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWindow = typeof window & { showSaveFilePicker?: (opts: any) => Promise<any> };

export default function UnitDownloadButton({ unitId, chassis, variant = "button" }: Props) {
  const [progress, setProgress] = useState<number | null>(null); // null = idle
  const [error, setError] = useState("");
  const busy = progress !== null;

  const safeName = (chassis || "unit").replace(/[<>:"/\\|?*]/g, "-").trim() || "unit";

  const download = async () => {
    setError("");
    setProgress(0);

    try {
      const win = window as AnyWindow;
      const url = `/api/units/${unitId}/download`;

      // ── Modern path: Save As dialog + streamed progress (Chrome/Edge) ──
      if (typeof win.showSaveFilePicker === "function") {
        let handle;
        try {
          handle = await win.showSaveFilePicker({
            suggestedName: `${safeName}.zip`,
            types: [{ description: "ZIP archive", accept: { "application/zip": [".zip"] } }],
          });
        } catch (e) {
          // user cancelled the Save As dialog
          if ((e as DOMException)?.name === "AbortError") { setProgress(null); return; }
          throw e;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Download failed");

        const total = Number(res.headers.get("Content-Length")) || 0;
        const writable = await handle.createWritable();
        const reader = res.body!.getReader();
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writable.write(value);
          received += value.length;
          if (total > 0) setProgress(Math.min(99, Math.round((received / total) * 100)));
        }
        await writable.close();
        setProgress(100);
        setTimeout(() => setProgress(null), 1200);
        return;
      }

      // ── Fallback: stream + blob, then trigger a normal download ──
      const res = await fetch(url);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Download failed");

      const total = Number(res.headers.get("Content-Length")) || 0;
      const reader = res.body!.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total > 0) setProgress(Math.min(99, Math.round((received / total) * 100)));
      }
      const blob = new Blob(chunks as BlobPart[], { type: "application/zip" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${safeName}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      setProgress(100);
      setTimeout(() => setProgress(null), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
      setProgress(null);
    }
  };

  const label =
    progress === null ? "Download All" :
    progress === 100  ? "Done ✓" :
    `Downloading ${progress}%`;

  if (variant === "icon") {
    return (
      <button
        onClick={download}
        disabled={busy}
        title="Download all documents (ZIP)"
        style={{
          display: "inline-flex", alignItems: "center", gap: "5px",
          padding: "5px 10px", borderRadius: "6px",
          border: "1px solid #bbf7d0", background: busy ? "#f0fdf4" : "#ecfdf5",
          fontSize: "11px", fontWeight: 600, color: "#047857",
          cursor: busy ? "default" : "pointer", whiteSpace: "nowrap",
        }}
      >
        <DownloadIcon />
        {progress === null ? "ZIP" : progress === 100 ? "✓" : `${progress}%`}
      </button>
    );
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: "4px" }}>
      <button
        onClick={download}
        disabled={busy}
        style={{
          display: "inline-flex", alignItems: "center", gap: "7px",
          padding: "8px 16px", borderRadius: "8px", border: "none",
          fontSize: "13px", fontWeight: 600, color: "white",
          background: busy ? "#6b7280" : "linear-gradient(135deg, #059669, #047857)",
          cursor: busy ? "default" : "pointer",
          boxShadow: "0 2px 8px rgba(5,150,105,0.3)",
          minWidth: "150px", justifyContent: "center",
        }}
      >
        <DownloadIcon />
        {label}
      </button>
      {progress !== null && progress < 100 && (
        <div style={{ height: "4px", background: "#e5e7eb", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "#059669", transition: "width 150ms" }} />
        </div>
      )}
      {error && <span style={{ fontSize: "11px", color: "#dc2626" }}>{error}</span>}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
