import type { ComponentProps } from "react";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { queryOne } from "@/lib/pg";
import { serializeInvoice } from "@/lib/serialize";
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

  const INVOICE_SELECT = `
    SELECT i.id, i.lead_id, i.created_by, i.approved_by, i.consignee_name, i.consignee_address, i.consignee_phone, i.consignee_country, i.consignee_port,
           i.unit, i.chassis_no, i.engine_no, i.color, i.year, i.salesperson, i.fuel, i.transmission, i.m3_rate, i.exchange_rate, i.push_price, i.cnf_price,
           i.advance_percent, i.status, i.rejection_note, i.created_at, i.updated_at,
           i.uploaded_pdf_filename, i.uploaded_pdf_uploaded_at, (i.uploaded_pdf_data IS NOT NULL) AS has_uploaded_pdf,
           u.name AS created_by_name, u.email AS created_by_email,
           a.name AS approved_by_name,
           l.customer_name AS lead_customer_name, l.contact_person AS lead_contact_person, l.country AS lead_country, l.port AS lead_port
    FROM invoices i
    LEFT JOIN users u ON u.id = i.created_by
    LEFT JOIN users a ON a.id = i.approved_by
    LEFT JOIN leads l ON l.id = i.lead_id
    WHERE i.id = $1
  `;

  let fetched: [Record<string, unknown> | null, { id: string } | null] | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise<void>((r) => setTimeout(r, 500 * attempt));
      fetched = await Promise.all([
        queryOne<Record<string, unknown>>(INVOICE_SELECT, [id]),
        queryOne<{ id: string }>(`SELECT id FROM units WHERE invoice_id = $1`, [id]),
      ]);
      break;
    } catch {
      if (attempt === 2) fetched = null;
    }
  }

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
  const isOwner = raw.created_by === session!.user.id;

  if (!isElevated && !isOwner) notFound();

  const invoice = serializeInvoice(raw);
  const unitId = existingUnit ? existingUnit.id : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div className="no-print">
        <TopBar />
      </div>
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {backLink}

        {/* leadId is always the joined { customerName, contactPerson, ... } object here — this query always joins leads */}
        <InvoiceDetail invoice={invoice as unknown as ComponentProps<typeof InvoiceDetail>["invoice"]} role={role} unitId={unitId} />

        {["admin", "manager", "super_admin"].includes(role) && (
          <PaymentSection
            invoiceId={id}
            role={role}
            invoiceCnfPrice={invoice.cnfPrice}
          />
        )}
      </div>
    </div>
  );
}
