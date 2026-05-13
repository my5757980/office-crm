"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "closed", label: "Closed" },
];

const controlStyle: React.CSSProperties = {
  height: "32px",
  padding: "0 10px",
  border: "1px solid #d0d7de",
  borderRadius: "6px",
  fontSize: "12px",
  color: "#1f2328",
  background: "#ffffff",
  outline: "none",
  transition: "border-color 150ms, box-shadow 150ms",
};

export default function LeadFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    value ? p.set(key, value) : p.delete(key);
    p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  }, [router, pathname, searchParams]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      <span style={{ fontSize: "11px", fontWeight: 600, color: "#8c959f", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: "4px" }}>Filter</span>

      <div style={{ position: "relative" }}>
        <svg style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8c959f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input
          type="text"
          placeholder="Search…"
          defaultValue={searchParams.get("search") || ""}
          onChange={e => update("search", e.target.value)}
          style={{ ...controlStyle, paddingLeft: "28px", width: "160px" }}
          onFocus={e => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)"; }}
          onBlur={e => { e.target.style.borderColor = "#d0d7de"; e.target.style.boxShadow = "none"; }}
        />
      </div>

      <select
        defaultValue={searchParams.get("status") || ""}
        onChange={e => update("status", e.target.value)}
        style={controlStyle}
        onFocus={e => { e.target.style.borderColor = "#2563eb"; }}
        onBlur={e => { e.target.style.borderColor = "#d0d7de"; }}
      >
        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <input type="date" defaultValue={searchParams.get("from") || ""} onChange={e => update("from", e.target.value)} style={controlStyle}
        onFocus={e => { e.target.style.borderColor = "#2563eb"; }} onBlur={e => { e.target.style.borderColor = "#d0d7de"; }} />
      <span style={{ fontSize: "11px", color: "#8c959f" }}>—</span>
      <input type="date" defaultValue={searchParams.get("to") || ""} onChange={e => update("to", e.target.value)} style={controlStyle}
        onFocus={e => { e.target.style.borderColor = "#2563eb"; }} onBlur={e => { e.target.style.borderColor = "#d0d7de"; }} />
    </div>
  );
}
