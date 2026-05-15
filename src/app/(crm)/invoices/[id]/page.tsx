import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";
import InvoiceDetail from "@/components/invoices/InvoiceDetail";
import PaymentSection from "@/components/invoices/PaymentSection";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  await dbConnect();

  const raw = await Invoice.findById(id)
    .populate("createdBy", "name email")
    .populate("approvedBy", "name")
    .populate("leadId", "customerName contactPerson country port")
    .lean();

  if (!raw) notFound();

  const role = session!.user.role;
  const isElevated = ["admin", "manager", "super_admin"].includes(role);
  const isOwner = (raw.createdBy as { _id: { toString(): string } })._id.toString() === session!.user.id;

  if (!isElevated && !isOwner) notFound();

  const invoice = JSON.parse(JSON.stringify(raw));

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div className="no-print">
        <TopBar />
      </div>
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <Link
          href="/invoices"
          className="no-print"
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            fontSize: "13px", fontWeight: 500,
            color: "#656d76", textDecoration: "none",
            transition: "color 150ms",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Invoices
        </Link>

        <InvoiceDetail invoice={invoice} role={role} />

        {["admin", "manager", "super_admin"].includes(role) && (
          <PaymentSection
            invoiceId={id}
            role={role}
            invoiceCnfPrice={raw.cnfPrice}
          />
        )}
      </div>
    </div>
  );
}
