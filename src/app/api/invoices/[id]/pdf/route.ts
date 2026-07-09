import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/pg";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const invoice = await queryOne<{ created_by: string; uploaded_pdf_data: string | null }>(
    `SELECT created_by, uploaded_pdf_data FROM invoices WHERE id = $1`,
    [id]
  );
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isElevated = ["admin", "manager", "super_admin"].includes(session.user.role);
  const isOwner = invoice.created_by === session.user.id;

  if (!isElevated && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!invoice.uploaded_pdf_data) {
    return NextResponse.json({ error: "No PDF uploaded" }, { status: 404 });
  }

  return NextResponse.json({ data: invoice.uploaded_pdf_data });
}
