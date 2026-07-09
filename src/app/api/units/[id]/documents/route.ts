import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne, genId } from "@/lib/pg";
import { DOCUMENT_FOLDERS } from "@/lib/constants";
import { serializeUnitFile } from "@/lib/serialize";

type RouteContext = { params: Promise<{ id: string }> };

const CAN_UPLOAD = ["admin", "manager", "super_admin"];

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_UPLOAD.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const unit = await queryOne(`SELECT id FROM units WHERE id = $1`, [id]);
  if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

  const formData = await request.formData();
  const file   = formData.get("file") as File | null;
  const folder = formData.get("folder") as string | null;

  if (!file)   return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!folder || !(DOCUMENT_FOLDERS as readonly string[]).includes(folder))
    return NextResponse.json({ error: "Invalid folder" }, { status: 400 });

  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO unit_files (id, unit_id, folder, filename, mimetype, size, data) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, unit_id, folder, filename, mimetype, size, uploaded_at`,
    [genId(), id, folder, file.name, file.type || "application/octet-stream", file.size, buffer]
  );

  return NextResponse.json({ file: row ? serializeUnitFile(row) : null }, { status: 201 });
}
