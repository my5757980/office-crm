"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

interface Props { onClose: () => void; onCreated: () => void; }

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px",
  border: "1px solid #d0d7de", borderRadius: "8px",
  fontSize: "13px", color: "#1f2328", background: "#ffffff",
  outline: "none", boxSizing: "border-box",
  transition: "border-color 150ms, box-shadow 150ms",
};
const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 600, color: "#1f2328", marginBottom: "5px" };
const focusOn  = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)"; };
const focusOff = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "#d0d7de"; e.target.style.boxShadow = "none"; };

export default function CreateUserModal({ onClose, onCreated }: Props) {
  const { data: session } = useSession();
  const creatorRole = session?.user?.role ?? "";

  const isAdminOrManager  = creatorRole === "admin" || creatorRole === "manager";
  const isSupervisor      = creatorRole === "super_admin";

  const roleLabel    = isAdminOrManager ? "Supervisor" : "Agent";
  const roleValue    = isAdminOrManager ? "super_admin" : "user";

  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role: roleValue }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create user"); return; }
      onCreated();
    } finally { setLoading(false); }
  };

  if (!isAdminOrManager && !isSupervisor) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }}>
      <div style={{
        background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "12px",
        width: "100%", maxWidth: "440px", margin: "0 16px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid #d0d7de", background: "#f6f8fa",
        }}>
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1f2328" }}>Create {roleLabel}</h2>
            <p style={{ fontSize: "11px", color: "#8c959f", marginTop: "2px" }}>
              {isAdminOrManager ? "Admin/Manager can create Supervisors" : "Supervisor can create Agents"}
            </p>
          </div>
          <button onClick={onClose} style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: "6px", background: "transparent", cursor: "pointer", color: "#656d76" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Role badge */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f2f4", background: isAdminOrManager ? "#fef3c7" : "#dbeafe" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: isAdminOrManager ? "#92400e" : "#1d4ed8" }}>
            Role: {roleLabel} (auto-assigned)
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
          </div>
          <div>
            <label style={labelStyle}>Temporary Password</label>
            <input type="text" value={password} onChange={e => setPass(e.target.value)} required placeholder="Min. 8 characters" style={{ ...inputStyle, fontFamily: "monospace" }} onFocus={focusOn} onBlur={focusOff} />
            <p style={{ fontSize: "11px", color: "#8c959f", marginTop: "4px" }}>Share this with the user — they can change it after login</p>
          </div>

          {error && (
            <div style={{ background: "#ffebe9", border: "1px solid #ffcecb", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#cf222e" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "4px" }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, color: "#656d76", background: "#f6f8fa", border: "1px solid #d0d7de", cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ padding: "8px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, color: "white", background: loading ? "#93c5fd" : "linear-gradient(135deg, #2563eb, #1d4ed8)", border: "none", cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}>
              {loading ? "Creating…" : `Create ${roleLabel}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
