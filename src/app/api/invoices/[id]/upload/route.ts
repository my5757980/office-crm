import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "super_admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const { id } = await params;

  const invoice = await Invoice.findById(id);
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

  invoice.uploadedPdf = {
    data: base64,
    filename: file.name,
    uploadedAt: new Date(),
  };
  await invoice.save();

  return NextResponse.json({ success: true, filename: file.name });
}
