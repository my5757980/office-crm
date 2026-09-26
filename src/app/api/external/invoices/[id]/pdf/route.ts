// For the SBK website: the invoice PDF a super admin uploaded in the CRM.
import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/pg";
import { contentDisposition, invoiceNumber, verifyApiRequest } from "@/lib/website-link";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  if (!verifyApiRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invoice = await queryOne<{ uploaded_pdf_data: string | null; uploaded_pdf_filename: string | null }>(
    `SELECT uploaded_pdf_data, uploaded_pdf_filename FROM invoices WHERE id = $1`,
    [id]
  );
  if (!invoice?.uploaded_pdf_data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Stored as plain base64 by the upload route; older rows may carry a data: prefix.
  const base64 = invoice.uploaded_pdf_data.replace(/^data:[^,]*,/, "");
  const bytes = Buffer.from(base64, "base64");

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition("inline", invoice.uploaded_pdf_filename || `${invoiceNumber(id)}.pdf`),
      "Cache-Control": "no-store",
    },
  });
}
