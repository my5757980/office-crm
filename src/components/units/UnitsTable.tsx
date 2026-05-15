"use client";

import { useState } from "react";
import Link from "next/link";

type UnitRow = {
  _id: string;
  make: string;
  carModel: string;
  year: number;
  chassis: string;
  color: string;
  drive: string;
  fuel: string;
  mileage: number;
  location: string;
  createdBy?: { name: string };
};

export default function UnitsTable({
  units,
  coverMap,
}: {
  units: UnitRow[];
  coverMap: Record<string, string>;
}) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? units.filter(u =>
        `${u.year} ${u.make} ${u.carModel}`.toLowerCase().includes(q) ||
        u.chassis.toLowerCase().includes(q) ||
        u.color.toLowerCase().includes(q) ||
        u.make.toLowerCase().includes(q) ||
        u.carModel.toLowerCase().includes(q) ||
        String(u.year).includes(q)
      )
    : units;

  return (
    <>
      {/* Search bar */}
      <div style={{ padding: "16px", borderBottom: "1px solid #d0d7de" }}>
        <div style={{ position: "relative", maxWidth: "360px" }}>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#8c959f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by make, model, year, chassis, color…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "8px 12px 8px 32px",
              fontSize: "13px", color: "#1f2328",
              border: "1px solid #d0d7de", borderRadius: "8px",
              background: "#f6f8fa", outline: "none",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = "#0969da"; e.currentTarget.style.background = "#fff"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "#d0d7de"; e.currentTarget.style.background = "#f6f8fa"; }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", padding: "2px",
                color: "#8c959f", fontSize: "14px", lineHeight: 1,
              }}
            >✕</button>
          )}
        </div>
        {q && (
          <p style={{ fontSize: "12px", color: "#8c959f", marginTop: "6px" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "64px", textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔍</div>
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#1f2328" }}>No units found</p>
          <p style={{ fontSize: "13px", color: "#8c959f", marginTop: "4px" }}>Try a different search term</p>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f6f8fa", borderBottom: "1px solid #d0d7de" }}>
              {["Vehicle", "Chassis", "Color", "Drive / Fuel", "Mileage", "Location", "Added By", ""].map(h => (
                <th key={h} style={{ padding: "10px 16px", fontSize: "11px", fontWeight: 700, color: "#656d76", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => {
              const coverId = coverMap[u._id];
              return (
                <tr key={u._id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f0f2f4" : "none" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{
                        width: "40px", height: "40px", borderRadius: "8px", flexShrink: 0,
                        background: coverId ? "transparent" : "linear-gradient(135deg, #059669, #047857)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px",
                        overflow: "hidden",
                      }}>
                        {coverId
                          ? <img src={`/api/units/${u._id}/documents/${coverId}`} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : "🚗"
                        }
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: "#1f2328" }}>{u.year} {u.make} {u.carModel}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#656d76", fontFamily: "monospace", fontSize: "12px" }}>{u.chassis}</td>
                  <td style={{ padding: "12px 16px", color: "#656d76" }}>{u.color}</td>
                  <td style={{ padding: "12px 16px", color: "#656d76" }}>{u.drive} · {u.fuel}</td>
                  <td style={{ padding: "12px 16px", color: "#656d76" }}>{u.mileage.toLocaleString()} km</td>
                  <td style={{ padding: "12px 16px", color: "#656d76" }}>{u.location}</td>
                  <td style={{ padding: "12px 16px", color: "#8c959f", fontSize: "12px" }}>{u.createdBy?.name ?? "—"}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <Link href={`/units/${u._id}`} style={{
                      fontSize: "11px", fontWeight: 600, padding: "5px 12px", borderRadius: "6px",
                      background: "#eff6ff", color: "#2563eb", textDecoration: "none",
                      border: "1px solid #bfdbfe",
                    }}>View</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
