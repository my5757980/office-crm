"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const roleConfig: Record<string, { label: string; bg: string; color: string }> = {
  user:        { label: "Agent",      bg: "#dbeafe", color: "#1d4ed8" },
  admin:       { label: "Admin",      bg: "#ede9fe", color: "#5b21b6" },
  manager:     { label: "Manager",    bg: "#d1fae5", color: "#065f46" },
  super_admin: { label: "Supervisor", bg: "#fef3c7", color: "#92400e" },
};

const thStyle: React.CSSProperties = {
  padding: "10px 18px",
  fontSize: "11px", fontWeight: 700,
  color: "#656d76",
  textAlign: "left",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  background: "#f6f8fa",
  borderBottom: "1px solid #d0d7de",
  whiteSpace: "nowrap",
};

// Roles whose passwords the current user can reset
const RESET_ALLOWED: Record<string, string[]> = {
  admin:   ["manager", "super_admin", "user"],
  manager: ["super_admin", "user"],
};

export default function UserTable({ users: initialUsers, currentRole }: { users: User[]; currentRole: string }) {
  const [users, setUsers] = useState(initialUsers);
  const router = useRouter();
  const canEdit = ["admin", "manager"].includes(currentRole);

  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPwd, setNewPwd]           = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [pwdError, setPwdError]       = useState("");
  const [pwdLoading, setPwdLoading]   = useState(false);
  const [pwdDone, setPwdDone]         = useState(false);

  const openResetModal = (user: User) => {
    setResetTarget(user);
    setNewPwd(""); setConfirmPwd(""); setPwdError(""); setPwdDone(false);
  };

  const closeResetModal = () => { setResetTarget(null); };

  const handlePasswordReset = async () => {
    if (newPwd.length < 6)           { setPwdError("Password must be at least 6 characters"); return; }
    if (newPwd !== confirmPwd)        { setPwdError("Passwords do not match"); return; }
    if (!resetTarget) return;
    setPwdLoading(true); setPwdError("");
    const res = await fetch(`/api/admin/users/${resetTarget._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPwd }),
    });
    setPwdLoading(false);
    if (res.ok) { setPwdDone(true); }
    else { const j = await res.json().catch(() => ({})); setPwdError(j.error ?? "Failed"); }
  };

  const updateUser = async (id: string, updates: Partial<{ role: string; isActive: boolean }>) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const { user } = await res.json();
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, ...user } : u)));
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? `Failed (${res.status})`);
    }
  };

  if (users.length === 0) {
    return <div style={{ padding: "48px", textAlign: "center", fontSize: "13px", color: "#8c959f" }}>No users found.</div>;
  }

  return (
    <div>
      {/* Reset Password Modal */}
      {resetTarget && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "16px",
        }}>
          <div style={{
            background: "#fff", borderRadius: "12px", padding: "28px",
            width: "100%", maxWidth: "380px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          }}>
            {pwdDone ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>✅</div>
                <p style={{ fontWeight: 700, fontSize: "15px", color: "#1f2328" }}>Password Reset!</p>
                <p style={{ fontSize: "13px", color: "#656d76", marginBottom: "20px" }}>
                  {resetTarget.name}&apos;s password has been updated.
                </p>
                <button onClick={closeResetModal} style={{
                  padding: "8px 24px", borderRadius: "8px", border: "none",
                  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                  color: "#fff", fontWeight: 600, fontSize: "13px", cursor: "pointer",
                }}>Close</button>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1f2328", marginBottom: "4px" }}>
                  Reset Password
                </h3>
                <p style={{ fontSize: "13px", color: "#656d76", marginBottom: "20px" }}>
                  Set new password for <strong>{resetTarget.name}</strong> ({resetTarget.email})
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#1f2328", display: "block", marginBottom: "4px" }}>New Password</label>
                    <input
                      type="password" value={newPwd}
                      onChange={e => setNewPwd(e.target.value)}
                      placeholder="Min 6 characters"
                      style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#1f2328", display: "block", marginBottom: "4px" }}>Confirm Password</label>
                    <input
                      type="password" value={confirmPwd}
                      onChange={e => setConfirmPwd(e.target.value)}
                      placeholder="Repeat password"
                      style={{ width: "100%", padding: "9px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "13px", boxSizing: "border-box" }}
                    />
                  </div>
                  {pwdError && (
                    <div style={{ fontSize: "12px", color: "#cf222e", background: "#ffebe9", padding: "8px 12px", borderRadius: "6px" }}>
                      {pwdError}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    <button onClick={closeResetModal} style={{
                      flex: 1, padding: "9px", borderRadius: "8px",
                      border: "1px solid #d0d7de", background: "#f6f8fa",
                      color: "#1f2328", fontWeight: 600, fontSize: "13px", cursor: "pointer",
                    }}>Cancel</button>
                    <button onClick={handlePasswordReset} disabled={pwdLoading} style={{
                      flex: 1, padding: "9px", borderRadius: "8px", border: "none",
                      background: pwdLoading ? "#93c5fd" : "linear-gradient(135deg,#2563eb,#1d4ed8)",
                      color: "#fff", fontWeight: 600, fontSize: "13px",
                      cursor: pwdLoading ? "not-allowed" : "pointer",
                    }}>
                      {pwdLoading ? "Saving…" : "Save Password"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Role</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Joined</th>
            <th style={thStyle} />
          </tr>
        </thead>
        <tbody>
          {users.map((user, i) => {
            const cfg = roleConfig[user.role];
            return (
              <tr
                key={user._id}
                style={{ borderBottom: i < users.length - 1 ? "1px solid #f0f2f4" : "none", transition: "background 120ms" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f6f8fa"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <td style={{ padding: "13px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", fontWeight: 700, color: "white",
                    }}>
                      {user.name[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, color: "#1f2328" }}>{user.name}</span>
                  </div>
                </td>
                <td style={{ padding: "13px 18px", color: "#656d76", fontSize: "12px" }}>{user.email}</td>
                <td style={{ padding: "13px 18px" }}>
                  {canEdit ? (
                    <select
                      value={user.role}
                      onChange={(e) => updateUser(user._id, { role: e.target.value })}
                      style={{
                        fontSize: "11px", fontWeight: 600,
                        padding: "3px 8px", borderRadius: "20px",
                        border: "none", outline: "none", cursor: "pointer",
                        background: cfg?.bg ?? "#f3f4f6",
                        color: cfg?.color ?? "#374151",
                      }}
                    >
                      <option value="user">Agent</option>
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="super_admin">Supervisor</option>
                    </select>
                  ) : (
                    <span style={{
                      display: "inline-block", fontSize: "11px", fontWeight: 600,
                      padding: "3px 10px", borderRadius: "20px",
                      background: cfg?.bg ?? "#f3f4f6", color: cfg?.color ?? "#374151",
                    }}>
                      {cfg?.label ?? user.role}
                    </span>
                  )}
                </td>
                <td style={{ padding: "13px 18px" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "5px",
                    padding: "3px 10px", borderRadius: "20px",
                    fontSize: "11px", fontWeight: 600,
                    background: user.isActive ? "#d1fae5" : "#ffebe9",
                    color: user.isActive ? "#065f46" : "#cf222e",
                  }}>
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: user.isActive ? "#10b981" : "#f85149" }} />
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ padding: "13px 18px", color: "#8c959f", fontSize: "12px", whiteSpace: "nowrap" }}>
                  {new Date(user.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td style={{ padding: "13px 18px", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                    {canEdit && RESET_ALLOWED[currentRole]?.includes(user.role) && (
                      <button
                        onClick={() => openResetModal(user)}
                        style={{
                          fontSize: "11px", fontWeight: 600,
                          padding: "4px 12px", borderRadius: "6px",
                          border: "1px solid #d0d7de", cursor: "pointer",
                          background: "#f6f8fa", color: "#1f2328",
                          transition: "all 150ms",
                        }}
                      >
                        Reset Password
                      </button>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => updateUser(user._id, { isActive: !user.isActive })}
                        style={{
                          fontSize: "11px", fontWeight: 600,
                          padding: "4px 12px", borderRadius: "6px",
                          border: "none", cursor: "pointer",
                          background: user.isActive ? "#ffebe9" : "#d1fae5",
                          color: user.isActive ? "#cf222e" : "#065f46",
                          transition: "all 150ms",
                        }}
                      >
                        {user.isActive ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </div>
  );
}
