import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import UnitFile from "@/models/UnitFile";

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const { fileId } = await params;

  const file = await UnitFile.findById(fileId);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(file.data as unknown as BodyInit, {
    headers: {
      "Content-Type": file.mimetype,
      "Content-Disposition": `inline; filename="${file.filename}"`,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["admin", "manager", "super_admin"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const { fileId } = await params;

  await UnitFile.findByIdAndDelete(fileId);
  return NextResponse.json({ success: true });
}
