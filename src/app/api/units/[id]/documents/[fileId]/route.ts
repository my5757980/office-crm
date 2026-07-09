import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/pg";

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await params;

  const file = await queryOne<{ data: Buffer; mimetype: string; filename: string }>(
    `SELECT data, mimetype, filename FROM unit_files WHERE id = $1`,
    [fileId]
  );
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

  const { fileId } = await params;

  await query(`DELETE FROM unit_files WHERE id = $1`, [fileId]);
  return NextResponse.json({ success: true });
}
