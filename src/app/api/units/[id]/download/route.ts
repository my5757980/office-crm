import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Unit from "@/models/Unit";
import UnitFile from "@/models/UnitFile";
import { zipChunks, zipByteLength, safeSegment, type ZipEntry } from "@/lib/zip";

export const runtime = "nodejs";

const CAN_DOWNLOAD = ["manager", "super_admin"];

type RouteContext = { params: Promise<{ id: string }> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBuffer(data: any): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (data?.buffer) return Buffer.from(data.buffer);
  return Buffer.from(data);
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_DOWNLOAD.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const { id } = await params;

  const unit = await Unit.findById(id).select("chassis make carModel year").lean();
  if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

  const files = await UnitFile.find({ unitId: id }).lean();
  if (files.length === 0)
    return NextResponse.json({ error: "No documents to download for this unit" }, { status: 404 });

  const rootFolder = safeSegment(unit.chassis || `${unit.make}-${unit.carModel}`);

  // Track duplicate filenames within the same folder so nothing gets overwritten
  const seen: Record<string, number> = {};
  const entries: ZipEntry[] = files.map((f) => {
    const folder = safeSegment(f.folder);
    let name = safeSegment(f.filename);
    const key = `${folder}/${name}`;
    if (seen[key] != null) {
      seen[key]++;
      const dot = name.lastIndexOf(".");
      name = dot > 0 ? `${name.slice(0, dot)} (${seen[key]})${name.slice(dot)}` : `${name} (${seen[key]})`;
    } else {
      seen[key] = 0;
    }
    return { path: `${rootFolder}/${folder}/${name}`, data: toBuffer(f.data) };
  });

  const filename = `${rootFolder}.zip`;
  const totalLength = zipByteLength(entries);

  // Stream the ZIP chunk-by-chunk so the response is never buffered as one
  // big payload — this avoids serverless response-size limits (Vercel ~4.5 MB).
  const iterator = zipChunks(entries);
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const { value, done } = iterator.next();
      if (done) { controller.close(); return; }
      controller.enqueue(new Uint8Array(value));
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(totalLength),
      "Cache-Control": "no-store",
    },
  });
}
