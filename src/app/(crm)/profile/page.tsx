"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import TopBar from "@/components/layout/TopBar";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  border: "1px solid #d0d7de", borderRadius: "8px",
  fontSize: "14px", color: "#1f2328", background: "#ffffff",
  outline: "none", boxSizing: "border-box",
  transition: "border-color 150ms, box-shadow 150ms",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "13px",
  fontWeight: 600, color: "#1f2328", marginBottom: "6px",
};

export default function ProfilePage() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";

  // Email form
  const [curPassEmail, setCurPassEmail] = useState("");
  const [newEmail, setNewEmail]         = useState("");
  const [emailMsg, setEmailMsg]         = useState<{ text: string; ok: boolean } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Password form
  const [curPassPwd, setCurPassPwd]   = useState("");
  const [newPwd, setNewPwd]           = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [pwdMsg, setPwdMsg]           = useState<{ text: string; ok: boolean } | null>(null);
  const [pwdLoading, setPwdLoading]   = useState(false);

  if (!["admin", "manager"].includes(role)) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <TopBar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: "14px", color: "#656d76" }}>Access denied.</p>
        </div>
      </div>
    );
  }

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMsg(null); setEmailLoading(true);
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: curPassEmail, newEmail }),
      });
      const json = await res.json();
      if (!res.ok) { setEmailMsg({ text: json.error, ok: false }); return; }
      setEmailMsg({ text: "Email updated! Please sign in again with your new email.", ok: true });
      setCurPassEmail(""); setNewEmail("");
      setTimeout(() => signOut({ callbackUrl: "/login" }), 2000);
    } finally { setEmailLoading(false); }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd !== confirmPwd) { setPwdMsg({ text: "Passwords do not match", ok: false }); return; }
    if (newPwd.length < 8)     { setPwdMsg({ text: "Password must be at least 8 characters", ok: false }); return; }
    setPwdLoading(true);
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: curPassPwd, newPassword: newPwd }),
      });
      const json = await res.json();
      if (!res.ok) { setPwdMsg({ text: json.error, ok: false }); return; }
      setPwdMsg({ text: "Password updated successfully! Please sign in again.", ok: true });
      setCurPassPwd(""); setNewPwd(""); setConfirmPwd("");
      setTimeout(() => signOut({ callbackUrl: "/login" }), 2000);
    } finally { setPwdLoading(false); }
  };

  const card: React.CSSProperties = {
    background: "#ffffff", border: "1px solid #d0d7de",
    borderRadius: "10px", overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  };

  const cardHeader: React.CSSProperties = {
    padding: "16px 24px", borderBottom: "1px solid #d0d7de",
    background: "linear-gradient(135deg, #f6f8fa 0%, #fef2f2 100%)",
    display: "flex", alignItems: "center", gap: "10px",
  };

  const focus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#c0272d";
    e.target.style.boxShadow = "0 0 0 3px rgba(192,39,45,0.12)";
  };
  const blur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#d0d7de";
    e.target.style.boxShadow = "none";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />
      <div style={{ flex: 1, padding: "24px", maxWidth: "600px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Page title */}
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1f2328" }}>My Profile</h1>
          <p style={{ fontSize: "13px", color: "#656d76", marginTop: "2px" }}>
            Update your login email and password
          </p>
        </div>

        {/* Current account info */}
        <div style={{ ...card }}>
          <div style={cardHeader}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "linear-gradient(135deg, #c0272d, #7b0e12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", fontWeight: 700, color: "white",
            }}>
              {(session?.user?.name ?? "U")[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#1f2328" }}>{session?.user?.name}</p>
              <p style={{ fontSize: "12px", color: "#656d76" }}>{session?.user?.email} · {role.charAt(0).toUpperCase() + role.slice(1)}</p>
            </div>
          </div>
        </div>

        {/* Change Email */}
        <div style={card}>
          <div style={cardHeader}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0272d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#1f2328" }}>Change Email</p>
          </div>
          <form onSubmit={handleEmailUpdate} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Current Password</label>
              <input type="password" required value={curPassEmail}
                onChange={e => setCurPassEmail(e.target.value)}
                placeholder="Enter current password"
                style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label style={labelStyle}>New Email</label>
              <input type="email" required value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="your@email.com"
                style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>

            {emailMsg && (
              <div style={{
                padding: "10px 14px", borderRadius: "8px", fontSize: "13px",
                background: emailMsg.ok ? "#f0fdf4" : "#ffebe9",
                border: `1px solid ${emailMsg.ok ? "#86efac" : "#ffcecb"}`,
                color: emailMsg.ok ? "#15803d" : "#cf222e",
              }}>{emailMsg.text}</div>
            )}

            <button type="submit" disabled={emailLoading} style={{
              padding: "10px", borderRadius: "8px", border: "none",
              fontSize: "14px", fontWeight: 600, color: "white",
              background: emailLoading ? "#e57373" : "linear-gradient(135deg, #c0272d, #8b1a1e)",
              cursor: emailLoading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(192,39,45,0.3)",
              transition: "all 150ms",
            }}>
              {emailLoading ? "Updating…" : "Update Email"}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div style={card}>
          <div style={cardHeader}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0272d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#1f2328" }}>Change Password</p>
          </div>
          <form onSubmit={handlePasswordUpdate} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Current Password</label>
              <input type="password" required value={curPassPwd}
                onChange={e => setCurPassPwd(e.target.value)}
                placeholder="Enter current password"
                style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label style={labelStyle}>New Password</label>
              <input type="password" required value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="Min 8 characters"
                style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <input type="password" required value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="Repeat new password"
                style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>

            {pwdMsg && (
              <div style={{
                padding: "10px 14px", borderRadius: "8px", fontSize: "13px",
                background: pwdMsg.ok ? "#f0fdf4" : "#ffebe9",
                border: `1px solid ${pwdMsg.ok ? "#86efac" : "#ffcecb"}`,
                color: pwdMsg.ok ? "#15803d" : "#cf222e",
              }}>{pwdMsg.text}</div>
            )}

            <button type="submit" disabled={pwdLoading} style={{
              padding: "10px", borderRadius: "8px", border: "none",
              fontSize: "14px", fontWeight: 600, color: "white",
              background: pwdLoading ? "#e57373" : "linear-gradient(135deg, #c0272d, #8b1a1e)",
              cursor: pwdLoading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(192,39,45,0.3)",
              transition: "all 150ms",
            }}>
              {pwdLoading ? "Updating…" : "Update Password"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
