"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface SidebarProps { role: string }

const roleMap: Record<string, { label: string; color: string }> = {
  user:        { label: "Agent",      color: "#388bfd" },
  admin:       { label: "Admin",      color: "#a371f7" },
  manager:     { label: "Manager",    color: "#3fb950" },
  super_admin: { label: "Supervisor", color: "#e3b341" },
};

const navGroups = (role: string) => {
  const isElevated = ["admin", "manager", "super_admin"].includes(role);
  return [
    {
      label: "Overview",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: IconDashboard, show: true },
        { href: "/invoices",  label: "Invoices",  icon: IconInvoice,   show: true },
      ],
    },
    {
      label: "Leads",
      items: [
        { href: "/leads/new",   label: "New Lead",  icon: IconPlus,   show: role === "user" },
        { href: "/admin/leads", label: "All Leads", icon: IconLeads,  show: isElevated },
      ],
    },
    {
      label: "Operations",
      items: [
        { href: "/units", label: "Units", icon: IconUnit, show: ["user", "manager", "super_admin"].includes(role) },
      ],
    },
    {
      label: "Admin",
      items: [
        { href: "/admin/users", label: "Users", icon: IconUsers, show: ["admin", "manager", "super_admin"].includes(role) },
      ],
    },
  ];
};

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const roleInfo = roleMap[role] ?? { label: role, color: "#8c959f" };
  const groups = navGroups(role);

  return (
    <aside style={{
      width: "240px",
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "#0d1117",
      borderRight: "1px solid #21262d",
    }}>

      {/* Logo */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #21262d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src="/logo.png" alt="Logo" style={{ height: "40px", width: "auto", objectFit: "contain" }} />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
        {groups.map((group) => {
          const visible = group.items.filter(i => i.show);
          if (visible.length === 0) return null;
          return (
            <div key={group.label}>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#484f58", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 8px 6px" }}>
                {group.label}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {visible.map((item) => {
                  const isActive = pathname === item.href || (pathname.startsWith(item.href + "/") && item.href !== "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "7px 10px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? "#e6edf3" : "#8c959f",
                        background: isActive ? "#1a0a0b" : "transparent",
                        textDecoration: "none",
                        transition: "all 150ms",
                      }}
                      onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "#161b22"; (e.currentTarget as HTMLElement).style.color = "#e6edf3"; } }}
                      onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#8c959f"; } }}
                    >
                      <Icon active={isActive} />
                      {item.label}
                      {isActive && (
                        <div style={{ marginLeft: "auto", width: "6px", height: "6px", borderRadius: "50%", background: "#c0272d" }} />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ borderTop: "1px solid #21262d", padding: "12px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", marginBottom: "4px", borderRadius: "6px", background: "#161b22" }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, #c0272d, #7b0e12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", fontWeight: 700, color: "white",
          }}>
            {roleInfo.label[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#e6edf3", lineHeight: 1.3 }}>{roleInfo.label}</p>
            <p style={{ fontSize: "11px", color: roleInfo.color, fontWeight: 500 }}>● Online</p>
          </div>
        </div>
        {role === "manager" && (
          <button
            onClick={() => { window.location.href = "/api/backup"; }}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              width: "100%", padding: "7px 10px", border: "none",
              borderRadius: "6px", background: "transparent",
              fontSize: "13px", color: "#8c959f", cursor: "pointer",
              transition: "all 150ms", marginBottom: "2px",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#161b22"; (e.currentTarget as HTMLElement).style.color = "#3fb950"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#8c959f"; }}
          >
            <IconBackup />
            Database Backup
          </button>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            width: "100%", padding: "7px 10px", border: "none",
            borderRadius: "6px", background: "transparent",
            fontSize: "13px", color: "#8c959f", cursor: "pointer",
            transition: "all 150ms",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#161b22"; (e.currentTarget as HTMLElement).style.color = "#cf222e"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#8c959f"; }}
        >
          <IconLogout />
          Sign out
        </button>
      </div>
    </aside>
  );
}

/* Inline SVG icons */
function IconDashboard({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "#e6edf3" : "#656d76"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>;
}
function IconInvoice({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "#e6edf3" : "#656d76"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
}
function IconPlus({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "#e6edf3" : "#656d76"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>;
}
function IconLeads({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "#e6edf3" : "#656d76"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>;
}
function IconUsers({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "#e6edf3" : "#656d76"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function IconUnit({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "#e6edf3" : "#656d76"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 4v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
}
function IconKey({ active }: { active: boolean }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? "#e6edf3" : "#656d76"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>;
}
function IconBackup() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><line x1="12" y1="12" x2="12" y2="18"/><polyline points="9 15 12 18 15 15"/></svg>;
}
function IconLogout() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}
