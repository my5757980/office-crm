// For the SBK website: the bytes of one car photo or document. The website
// checks that the file belongs to the person viewing it and caches it.
import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/pg";
import { contentDisposition, verifyApiRequest } from "@/lib/website-link";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  if (!verifyApiRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const file = await queryOne<{ data: Buffer; mimetype: string | null; filename: string }>(
    `SELECT data, mimetype, filename FROM unit_files WHERE id = $1`,
    [id]
  );
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(file.data as unknown as BodyInit, {
    headers: {
      "Content-Type": file.mimetype || "application/octet-stream",
      "Content-Disposition": contentDisposition("inline", file.filename),
      "Cache-Control": "no-store",
    },
  });
}
