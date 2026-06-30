import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";
import Unit from "@/models/Unit";
import InvoiceDetail from "@/components/invoices/InvoiceDetail";
import PaymentSection from "@/components/invoices/PaymentSection";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";

const backLink = (
  <Link
    href="/invoices"
    className="no-print"
    style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      fontSize: "13px", fontWeight: 500,
      color: "#656d76", textDecoration: "none",
      transition: "color 150ms", alignSelf: "flex-start",
    }}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
    Back to Invoices
  </Link>
);

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  await dbConnect();

  const fetched = await Promise.all([
    Invoice.findById(id)
      .select("-uploadedPdf.data")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name")
      .populate("leadId", "customerName contactPerson country port")
      .lean(),
    Unit.findOne({ invoiceId: id }).select("_id").lean(),
  ]).catch(() => null);

  if (!fetched) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div className="no-print"><TopBar /></div>
        <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {backLink}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
            <div style={{ textAlign: "center", maxWidth: "360px" }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "10px",
                background: "#ffebe9", display: "flex", alignItems: "center",
                justifyContent: "center", margin: "0 auto 16px",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#cf222e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1f2328", marginBottom: "6px" }}>
                Failed to load invoice
              </h2>
              <p style={{ fontSize: "13px", color: "#656d76", marginBottom: "20px", lineHeight: 1.5 }}>
                A server error occurred. This is usually temporary — please go back and try again.
              </p>
              <Link
                href="/invoices"
                style={{
                  display: "inline-block", padding: "8px 20px", borderRadius: "8px",
                  fontSize: "13px", fontWeight: 600, color: "white",
                  background: "#2563eb", textDecoration: "none",
                }}
              >
                Back to Invoices
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [raw, existingUnit] = fetched;

  if (!raw) notFound();

  const role = session!.user.role;
  const isElevated = ["admin", "manager", "super_admin"].includes(role);
  const isOwner = (raw.createdBy as { _id?: { toString(): string } } | null)?._id?.toString() === session!.user.id;

  if (!isElevated && !isOwner) notFound();

  const invoice = JSON.parse(JSON.stringify(raw));
  const unitId = existingUnit ? (existingUnit._id as { toString(): string }).toString() : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div className="no-print">
        <TopBar />
      </div>
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {backLink}

        <InvoiceDetail invoice={invoice} role={role} unitId={unitId} />

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
