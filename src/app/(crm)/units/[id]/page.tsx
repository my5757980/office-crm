import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/pg";
import { DOCUMENT_FOLDERS } from "@/lib/constants";
import { serializeUnit, serializeUnitFile, serializePayment } from "@/lib/serialize";
import UnitDetail from "@/components/units/UnitDetail";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const role = session!.user.role;
  if (!["user", "manager", "super_admin"].includes(role)) notFound();

  const unitRow = await queryOne<Record<string, unknown>>(
    `SELECT u.*, us.name AS created_by_name FROM units u LEFT JOIN users us ON us.id = u.created_by WHERE u.id = $1`,
    [id]
  );
  if (!unitRow) notFound();

  const invoice = await queryOne<{ created_by: string; cnf_price: string }>(
    `SELECT created_by, cnf_price FROM invoices WHERE id = $1`,
    [unitRow.invoice_id as string]
  );

  if (role === "user") {
    if (!invoice || invoice.created_by !== session!.user.id) notFound();
  }

  const [fileRows, paymentRows, coverFile] = await Promise.all([
    query(`SELECT id, unit_id, folder, filename, mimetype, size, uploaded_at FROM unit_files WHERE unit_id = $1`, [id]),
    query(
      `SELECT p.receipt_image_data, p.receipt_image_filename, p.receipt_image_uploaded_at, p.received_date, p.selling_price, p.amount_received, p.exchange_rate, p.yen_amount, p.recorded_by, p.id, p.invoice_id, p.created_at,
              u.name AS recorded_by_name
       FROM payments p LEFT JOIN users u ON u.id = p.recorded_by
       WHERE p.invoice_id = $1 ORDER BY p.received_date ASC`,
      [unitRow.invoice_id as string]
    ),
    queryOne<{ id: string }>(`SELECT id FROM unit_files WHERE unit_id = $1 AND mimetype LIKE 'image/%' LIMIT 1`, [id]),
  ]);

  const files = fileRows.map(serializeUnitFile);
  const documents: Record<string, typeof files> = {};
  for (const folder of DOCUMENT_FOLDERS) {
    documents[folder] = files.filter(f => f.folder === folder);
  }

  const unitData        = serializeUnit(unitRow);
  const docsData        = documents;
  const paymentsData    = paymentRows.map(serializePayment);
  const coverFileId     = coverFile ? coverFile.id : null;
  const invoiceCnfPrice = invoice ? Number(invoice.cnf_price) : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px", background: "#f6f8fa" }}>
        <Link
          href="/units"
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            fontSize: "13px", fontWeight: 500, color: "#656d76", textDecoration: "none",
            alignSelf: "flex-start",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Units
        </Link>

        <UnitDetail unit={unitData} documents={docsData} role={role} payments={paymentsData} invoiceCnfPrice={invoiceCnfPrice} coverFileId={coverFileId} />
      </div>
    </div>
  );
}
