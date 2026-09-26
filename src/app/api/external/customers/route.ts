// For the SBK website's account sync: every customer that has at least one
// non-rejected invoice and an email, with the totals the website shows in its
// Users list. Read-only; the request must be signed by the website.
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/pg";
import { CUSTOMER_EMAIL_SQL, verifyApiRequest } from "@/lib/website-link";

export const dynamic = "force-dynamic";

interface CustomerRow {
  email: string;
  name: string | null;
  contact_person: string | null;
  phone: string | null;
  country: string | null;
  port: string | null;
  address: string | null;
  invoice_count: number;
  total: string | number | null;
  paid: string | number | null;
  last_invoice_at: string;
}

// The most recent non-empty value of a column across the customer's invoices.
const latest = (col: string) =>
  `(array_agg(inv.${col} ORDER BY inv.created_at DESC) FILTER (WHERE inv.${col} IS NOT NULL AND inv.${col} <> ''))[1]`;

export async function GET(req: NextRequest) {
  if (!verifyApiRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query<CustomerRow>(
    `WITH inv AS (
       SELECT i.id, i.created_at, i.cnf_price,
              ${CUSTOMER_EMAIL_SQL} AS email,
              l.customer_name, l.contact_person,
              COALESCE(NULLIF(trim(l.phone), ''), NULLIF(trim(i.consignee_phone), '')) AS phone,
              COALESCE(NULLIF(trim(l.country), ''), NULLIF(trim(i.consignee_country), '')) AS country,
              COALESCE(NULLIF(trim(l.port), ''), NULLIF(trim(i.consignee_port), '')) AS port,
              COALESCE(NULLIF(trim(l.address), ''), NULLIF(trim(i.consignee_address), '')) AS address
       FROM invoices i JOIN leads l ON l.id = i.lead_id
       WHERE i.status <> 'rejected'
     ),
     paid AS (
       SELECT invoice_id, SUM(amount_received) AS paid FROM payments GROUP BY invoice_id
     )
     SELECT inv.email,
            ${latest("customer_name")} AS name,
            ${latest("contact_person")} AS contact_person,
            ${latest("phone")} AS phone,
            ${latest("country")} AS country,
            ${latest("port")} AS port,
            ${latest("address")} AS address,
            count(*)::int AS invoice_count,
            COALESCE(SUM(inv.cnf_price), 0) AS total,
            COALESCE(SUM(paid.paid), 0) AS paid,
            max(inv.created_at) AS last_invoice_at
     FROM inv LEFT JOIN paid ON paid.invoice_id = inv.id
     WHERE inv.email LIKE '%_@_%'
     GROUP BY inv.email
     ORDER BY max(inv.created_at) DESC`
  );

  const customers = rows.map((r) => {
    const total = Number(r.total ?? 0);
    const paid = Number(r.paid ?? 0);
    return {
      email: r.email,
      name: r.name ?? "",
      contactPerson: r.contact_person ?? "",
      phone: r.phone ?? "",
      country: r.country ?? "",
      port: r.port ?? "",
      address: r.address ?? "",
      invoiceCount: r.invoice_count,
      total,
      paid,
      balance: total - paid,
      lastInvoiceAt: r.last_invoice_at,
    };
  });

  return NextResponse.json(
    { customers, generatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
