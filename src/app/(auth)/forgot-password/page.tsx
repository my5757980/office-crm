"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

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

const focus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = "#c0272d";
  e.target.style.boxShadow = "0 0 0 3px rgba(192,39,45,0.12)";
};
const blur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = "#d0d7de";
  e.target.style.boxShadow = "none";
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail]           = useState("");
  const [newEmail, setNewEmail]     = useState("");
  const [newPass, setNewPass]       = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [done, setDone]             = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPass !== confirmPass) { setError("Passwords do not match"); return; }
    if (newPass.length < 6)     { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          newEmail: newEmail.trim() || undefined,
          newPassword: newPass,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Something went wrong"); return; }
      setDone(true);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
        <img src="/logo.png" alt="Logo" style={{ height: "52px", width: "auto", objectFit: "contain" }} />
      </div>

      <div style={{
        background: "#ffffff", border: "1px solid #d0d7de",
        borderRadius: "12px", padding: "32px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1f2328" }}>Reset Credentials</h1>
          <p style={{ fontSize: "13px", color: "#656d76", marginTop: "4px" }}>
            Admin &amp; Manager only — set your new email and password
          </p>
        </div>

        {done ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{
              background: "#f0fdf4", border: "1px solid #86efac",
              borderRadius: "10px", padding: "20px", textAlign: "center",
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 10px" }}>
                <circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/>
              </svg>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "#15803d", marginBottom: "6px" }}>
                Credentials Updated!
              </p>
              <p style={{ fontSize: "13px", color: "#656d76" }}>
                Login with your new {newEmail.trim() ? "email and " : ""}password now.
              </p>
            </div>
            <button
              onClick={() => router.push("/login")}
              style={{
                width: "100%", padding: "10px", border: "none", borderRadius: "8px",
                fontSize: "14px", fontWeight: 600, color: "white",
                background: "linear-gradient(135deg, #c0272d, #8b1a1e)",
                cursor: "pointer", boxShadow: "0 2px 8px rgba(192,39,45,0.3)",
              }}
            >
              Go to Login →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            <div>
              <label style={labelStyle}>Current Email</label>
              <input type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@sbk.com"
                style={inputStyle} onFocus={focus} onBlur={blur} />
              <p style={{ fontSize: "11px", color: "#8c959f", marginTop: "4px" }}>
                Your current login email
              </p>
            </div>

            <div>
              <label style={labelStyle}>New Email <span style={{ fontWeight: 400, color: "#8c959f" }}>(optional)</span></label>
              <input type="email" value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="yournew@email.com"
                style={inputStyle} onFocus={focus} onBlur={blur} />
              <p style={{ fontSize: "11px", color: "#8c959f", marginTop: "4px" }}>
                Leave empty to keep current email
              </p>
            </div>

            <div>
              <label style={labelStyle}>New Password</label>
              <input type="password" required value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Min 6 characters"
                style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>

            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <input type="password" required value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Repeat new password"
                style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>

            {error && (
              <div style={{
                background: "#ffebe9", border: "1px solid #ffcecb",
                borderRadius: "8px", padding: "10px 14px",
                fontSize: "13px", color: "#cf222e",
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "10px", border: "none", borderRadius: "8px",
              fontSize: "14px", fontWeight: 600, color: "white",
              background: loading ? "#e57373" : "linear-gradient(135deg, #c0272d, #8b1a1e)",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(192,39,45,0.3)",
            }}>
              {loading ? "Updating…" : "Update & Save"}
            </button>
          </form>
        )}
      </div>

      <p style={{ textAlign: "center", fontSize: "13px", color: "#656d76", marginTop: "20px" }}>
        <Link href="/login" style={{ color: "#c0272d", fontWeight: 600, textDecoration: "none" }}>
          ← Back to Login
        </Link>
      </p>
    </div>
  );
}
