import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import TopBar from "@/components/layout/TopBar";

async function getStats(filter: Record<string, unknown>) {
  const [pending, approved, sent] = await Promise.all([
    Invoice.countDocuments({ ...filter, status: "pending" }),
    Invoice.countDocuments({ ...filter, status: "approved" }),
    Invoice.countDocuments({ ...filter, status: "sent" }),
  ]);
  return { pending, approved, sent };
}

function StatCard({ label, value, icon, bg, accent }: { label: string; value: number; icon: string; bg: string; accent: string }) {
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #d0d7de",
      borderRadius: "10px",
      padding: "18px 20px",
      display: "flex", alignItems: "center", gap: "14px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: "18px" }}>{icon}</span>
      </div>
      <div>
        <p style={{ fontSize: "24px", fontWeight: 700, color: "#1f2328", lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: "12px", color: "#656d76", marginTop: "3px", fontWeight: 500 }}>{label}</p>
      </div>
    </div>
  );
}

export default async function InvoicesPage() {
  const session = await auth();
  const role = session!.user.role;
  const isElevated = ["admin", "manager", "super_admin"].includes(role);

  await dbConnect();

  const filter = isElevated ? {} : { createdBy: session!.user.id };

  const [raw, stats] = await Promise.all([
    Invoice.find(filter)
      .populate("createdBy", "name email")
      .populate("leadId", "customerName")
      .sort({ createdAt: -1 })
      .lean(),
    getStats(filter),
  ]);

  const invoices = JSON.parse(JSON.stringify(raw));

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1f2328" }}>
            {isElevated ? "All Invoices" : "My Invoices"}
          </h1>
          <p style={{ fontSize: "13px", color: "#656d76", marginTop: "2px" }}>
            {isElevated ? "Invoice requests from all agents" : "Track your invoice requests"}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
          <StatCard label="Total"    value={invoices.length}  icon="📄" bg="#eff6ff" accent="#2563eb" />
          <StatCard label="Pending"  value={stats.pending}    icon="⏳" bg="#fffbeb" accent="#d97706" />
          <StatCard label="Approved" value={stats.approved}   icon="✅" bg="#f0fdf4" accent="#16a34a" />
          <StatCard label="Sent"     value={stats.sent}       icon="📬" bg="#faf5ff" accent="#7c3aed" />
        </div>

        {/* Table */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #d0d7de",
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          flex: 1,
        }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f2f4" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1f2328" }}>
              Invoice Requests · <span style={{ color: "#656d76", fontWeight: 400 }}>{invoices.length} record{invoices.length !== 1 ? "s" : ""}</span>
            </span>
          </div>
          <InvoiceTable invoices={invoices} showAgent={isElevated} />
        </div>
      </div>
    </div>
  );
}
