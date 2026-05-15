import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Unit from "@/models/Unit";
import UnitFile from "@/models/UnitFile";
import { DOCUMENT_FOLDERS } from "@/models/Unit";

type RouteContext = { params: Promise<{ id: string }> };

const CAN_UPLOAD = ["admin", "manager", "super_admin"];

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_UPLOAD.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const { id } = await params;

  const unit = await Unit.findById(id);
  if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

  const formData = await request.formData();
  const file   = formData.get("file") as File | null;
  const folder = formData.get("folder") as string | null;

  if (!file)   return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!folder || !(DOCUMENT_FOLDERS as readonly string[]).includes(folder))
    return NextResponse.json({ error: "Invalid folder" }, { status: 400 });

  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const doc = await UnitFile.create({
    unitId:     id,
    folder,
    filename:   file.name,
    mimetype:   file.type || "application/octet-stream",
    size:       file.size,
    data:       buffer,
    uploadedAt: new Date(),
  });

  return NextResponse.json({
    file: {
      _id:        doc._id,
      folder:     doc.folder,
      filename:   doc.filename,
      mimetype:   doc.mimetype,
      size:       doc.size,
      uploadedAt: doc.uploadedAt,
    },
  }, { status: 201 });
}
