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

export default function UserTable({ users: initialUsers, currentRole }: { users: User[]; currentRole: string }) {
  const [users, setUsers] = useState(initialUsers);
  const router = useRouter();
  const canEdit = ["admin", "manager"].includes(currentRole);

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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
