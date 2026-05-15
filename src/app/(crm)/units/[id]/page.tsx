import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/db";
import Unit from "@/models/Unit";
import UnitFile from "@/models/UnitFile";
import Payment from "@/models/Payment";
import Invoice from "@/models/Invoice";
import { DOCUMENT_FOLDERS } from "@/models/Unit";
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

  await dbConnect();

  const unit = await Unit.findById(id).populate("createdBy", "name").lean();
  if (!unit) notFound();

  if (role === "user") {
    const invoice = await Invoice.findById(unit.invoiceId).select("createdBy").lean();
    if (!invoice || invoice.createdBy.toString() !== session!.user.id) notFound();
  }

  const [files, payment, coverFile] = await Promise.all([
    UnitFile.find({ unitId: id }).select("-data").lean(),
    Payment.findOne({ invoiceId: unit.invoiceId, "receiptImage.data": { $exists: true } }).select("receiptImage").lean(),
    UnitFile.findOne({ unitId: id, mimetype: /^image\// }).select("_id").lean(),
  ]);

  const documents: Record<string, typeof files> = {};
  for (const folder of DOCUMENT_FOLDERS) {
    documents[folder] = files.filter(f => f.folder === folder);
  }

  const unitData     = JSON.parse(JSON.stringify(unit));
  const docsData     = JSON.parse(JSON.stringify(documents));
  const receiptImage = payment?.receiptImage ? JSON.parse(JSON.stringify(payment.receiptImage)) : null;
  const coverFileId  = coverFile ? coverFile._id.toString() : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px", background: "#f6f8fa" }}>
        <Link
          href={`/invoices/${unit.invoiceId}`}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            fontSize: "13px", fontWeight: 500, color: "#656d76", textDecoration: "none",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Invoice
        </Link>

        <UnitDetail unit={unitData} documents={docsData} role={role} receiptImage={receiptImage} coverFileId={coverFileId} />
      </div>
    </div>
  );
}
