"use client";

import Link from "next/link";

interface Notification {
  _id: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  invoiceId?: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const typeIcon: Record<string, string> = {
  invoice_requested: "🔔",
  invoice_approved:  "✅",
  invoice_rejected:  "❌",
};

export default function NotificationDropdown({ notifications }: { notifications: Notification[] }) {
  return (
    <div style={{
      position: "absolute", right: 0, top: "44px",
      width: "320px",
      background: "#ffffff",
      border: "1px solid #d0d7de",
      borderRadius: "10px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      zIndex: 50,
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "12px 16px",
        borderBottom: "1px solid #f0f2f4",
        background: "#f6f8fa",
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8c959f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#1f2328" }}>Notifications</span>
        {notifications.filter(n => !n.read).length > 0 && (
          <span style={{
            marginLeft: "auto",
            fontSize: "10px", fontWeight: 600,
            background: "#ffebe9", color: "#cf222e",
            padding: "2px 8px", borderRadius: "20px",
          }}>
            {notifications.filter(n => !n.read).length} new
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ padding: "32px 16px", textAlign: "center" }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>🔔</div>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328" }}>All caught up!</p>
          <p style={{ fontSize: "12px", color: "#8c959f", marginTop: "2px" }}>No notifications yet</p>
        </div>
      ) : (
        <ul style={{ maxHeight: "280px", overflowY: "auto" }}>
          {notifications.map((n, i) => {
            const content = (
              <>
                <span style={{ fontSize: "18px", flexShrink: 0, marginTop: "1px" }}>{typeIcon[n.type] ?? "📢"}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: "12px", color: "#1f2328", fontWeight: 500, lineHeight: 1.4 }}>{n.message}</p>
                  <p style={{ fontSize: "10px", color: "#8c959f", marginTop: "3px" }}>{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#2563eb", flexShrink: 0, marginTop: "4px" }} />}
              </>
            );

            const itemStyle: React.CSSProperties = {
              display: "flex", alignItems: "flex-start", gap: "10px",
              padding: "10px 16px",
              borderBottom: i < notifications.length - 1 ? "1px solid #f0f2f4" : "none",
              background: !n.read ? "#eff6ff" : "transparent",
              textDecoration: "none",
            };

            return n.invoiceId ? (
              <li key={n._id}>
                <Link href={`/invoices/${n.invoiceId}`} style={itemStyle}>{content}</Link>
              </li>
            ) : (
              <li key={n._id} style={itemStyle}>{content}</li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
