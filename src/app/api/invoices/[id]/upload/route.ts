import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/pg";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "super_admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const invoice = await queryOne<{ status: string }>(`SELECT status FROM invoices WHERE id = $1`, [id]);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["approved", "sent"].includes(invoice.status))
    return NextResponse.json({ error: "Can only upload PDF for approved invoices" }, { status: 400 });

  const formData = await request.formData();
  const file = formData.get("pdf") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.type !== "application/pdf")
    return NextResponse.json({ error: "Only PDF files allowed" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  await query(
    `UPDATE invoices SET uploaded_pdf_data = $1, uploaded_pdf_filename = $2, uploaded_pdf_uploaded_at = now(), updated_at = now() WHERE id = $3`,
    [base64, file.name, id]
  );

  return NextResponse.json({ success: true, filename: file.name });
}
