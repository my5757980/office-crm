"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import UserTable from "@/components/admin/UserTable";
import CreateUserModal from "@/components/admin/CreateUserModal";
import TopBar from "@/components/layout/TopBar";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!["admin", "manager", "super_admin"].includes(session?.user?.role ?? "")) {
      router.replace("/dashboard");
      return;
    }
    fetchUsers();
  }, [session, status, router]);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const { users } = await res.json();
      setUsers(users);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#8c959f", fontSize: "13px" }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1f2328" }}>User Management</h1>
            <p style={{ fontSize: "13px", color: "#656d76", marginTop: "2px" }}>Manage team members and their roles</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "8px 16px", borderRadius: "8px",
              fontSize: "13px", fontWeight: 600,
              color: "white", background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              border: "none", cursor: "pointer",
              boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
              transition: "all 150ms",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            New User
          </button>
        </div>

        <div style={{
          background: "#ffffff",
          border: "1px solid #d0d7de",
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f2f4" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328" }}>
              Team Members · <span style={{ color: "#656d76", fontWeight: 400 }}>{users.length} user{users.length !== 1 ? "s" : ""}</span>
            </span>
          </div>
          <UserTable users={users} currentRole={session?.user?.role ?? ""} />
        </div>
      </div>

      {showModal && (
        <CreateUserModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchUsers(); }}
        />
      )}
    </div>
  );
}
