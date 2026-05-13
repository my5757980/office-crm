"use client";

import { useSession } from "next-auth/react";
import NotificationBell from "@/components/notifications/NotificationBell";

const roleMap: Record<string, { label: string; bg: string; color: string }> = {
  user:        { label: "Agent",      bg: "#dbeafe", color: "#1d4ed8" },
  admin:       { label: "Admin",      bg: "#ede9fe", color: "#6d28d9" },
  manager:     { label: "Manager",    bg: "#d1fae5", color: "#065f46" },
  super_admin: { label: "Supervisor", bg: "#fef3c7", color: "#92400e" },
};

export default function TopBar() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";
  const roleInfo = roleMap[role] ?? { label: role, bg: "#f3f4f6", color: "#374151" };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      height: "52px",
      padding: "0 24px",
      background: "#ffffff",
      borderBottom: "1px solid #d0d7de",
      flexShrink: 0,
      gap: "12px",
    }}>
      <NotificationBell />

      <div style={{ width: "1px", height: "20px", background: "#d0d7de" }} />

      {/* Role badge */}
      <span style={{
        fontSize: "11px",
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: "20px",
        background: roleInfo.bg,
        color: roleInfo.color,
        letterSpacing: "0.02em",
      }}>
        {roleInfo.label}
      </span>

      {/* Avatar */}
      <div style={{
        width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg, #2563eb, #7c3aed)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "12px", fontWeight: 700, color: "white",
        boxShadow: "0 0 0 2px white, 0 0 0 3px #d0d7de",
      }}>
        {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328", lineHeight: 1.2 }}>
          {session?.user?.name ?? ""}
        </span>
        <span style={{ fontSize: "11px", color: "#8c959f" }}>
          {session?.user?.email ?? ""}
        </span>
      </div>
    </div>
  );
}
