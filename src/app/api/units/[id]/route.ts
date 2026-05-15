import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Unit from "@/models/Unit";
import UnitFile from "@/models/UnitFile";
import { DOCUMENT_FOLDERS } from "@/models/Unit";

type RouteContext = { params: Promise<{ id: string }> };

const CAN_EDIT = ["manager", "super_admin"];

const EDITABLE_FIELDS = ["make","carModel","year","color","chassis","engineCC","drive","fuel","mileage","transmission","steering","doors","seats","location"];

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_EDIT.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const unit = await Unit.findByIdAndUpdate(id, updates, { new: true });
  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ unit });
}

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
