import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const { id } = await params;

  const invoice = await Invoice.findById(id).select("createdBy uploadedPdf").lean();
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isElevated = ["admin", "manager", "super_admin"].includes(session.user.role);
  const isOwner = (invoice.createdBy as { toString(): string } | null)?.toString() === session.user.id;

  if (!isElevated && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!invoice.uploadedPdf?.data) {
    return NextResponse.json({ error: "No PDF uploaded" }, { status: 404 });
  }

  return NextResponse.json({ data: invoice.uploadedPdf.data });
}
