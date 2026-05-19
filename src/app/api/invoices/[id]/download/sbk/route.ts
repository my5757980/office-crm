import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";
import { generateSBKPdf } from "@/lib/pdf/sbk-pdf";

const CAN_DOWNLOAD = ["super_admin"];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !CAN_DOWNLOAD.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const { id } = await params;

  const inv = await Invoice.findById(id).lean();
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const invNo  = `SBK${id.slice(-5).toUpperCase()}`;
  const buffer = await generateSBKPdf(inv);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="SBK-Invoice-${invNo}.pdf"`,
    },
  });
}
