import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Unit from "@/models/Unit";
import UnitFile from "@/models/UnitFile";
import { DOCUMENT_FOLDERS } from "@/models/Unit";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const { id } = await params;

  const unit = await Unit.findById(id).populate("createdBy", "name").lean();
  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const files = await UnitFile.find({ unitId: id }).select("-data").lean();

  const documents: Record<string, typeof files> = {};
  for (const folder of DOCUMENT_FOLDERS) {
    documents[folder] = files.filter((f) => f.folder === folder);
  }

  return NextResponse.json({ unit, documents });
}
