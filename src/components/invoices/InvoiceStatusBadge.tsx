const statusConfig: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  pending:  { label: "Pending",  bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
  approved: { label: "Approved", bg: "#d1fae5", color: "#065f46", dot: "#10b981" },
  rejected: { label: "Rejected", bg: "#ffebe9", color: "#cf222e", dot: "#f85149" },
  sent:     { label: "Sent",     bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
};

export default function InvoiceStatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "3px 10px", borderRadius: "20px",
      fontSize: "11px", fontWeight: 600,
      background: cfg?.bg ?? "#f3f4f6",
      color: cfg?.color ?? "#374151",
    }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: cfg?.dot ?? "#9ca3af", flexShrink: 0 }} />
      {cfg?.label ?? status}
    </span>
  );
}
