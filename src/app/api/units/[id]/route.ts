import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/pg";
import { DOCUMENT_FOLDERS } from "@/lib/constants";
import { serializeUnit, serializeUnitFile } from "@/lib/serialize";

type RouteContext = { params: Promise<{ id: string }> };

const CAN_EDIT = ["manager", "super_admin"];

const EDITABLE_FIELD_TO_COLUMN: Record<string, string> = {
  make: "make", carModel: "car_model", year: "year", color: "color", chassis: "chassis",
  engineCC: "engine_cc", drive: "drive", fuel: "fuel", mileage: "mileage",
  transmission: "transmission", steering: "steering", doors: "doors", seats: "seats", location: "location",
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_EDIT.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const setClauses: string[] = [];
  const setParams: unknown[] = [];
  const setP = (v: unknown) => { setParams.push(v); return `$${setParams.length}`; };
  for (const [key, column] of Object.entries(EDITABLE_FIELD_TO_COLUMN)) {
    if (key in body) setClauses.push(`${column} = ${setP(body[key])}`);
  }

  if (setClauses.length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const row = await queryOne<Record<string, unknown>>(
    `UPDATE units SET ${setClauses.join(", ")} WHERE id = ${setP(id)} RETURNING *`,
    setParams
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ unit: serializeUnit(row) });
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const row = await queryOne<Record<string, unknown>>(
    `SELECT u.*, us.name AS created_by_name FROM units u LEFT JOIN users us ON us.id = u.created_by WHERE u.id = $1`,
    [id]
  );
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fileRows = await query(
    `SELECT id, unit_id, folder, filename, mimetype, size, uploaded_at FROM unit_files WHERE unit_id = $1`,
    [id]
  );
  const files = fileRows.map(serializeUnitFile);

  const documents: Record<string, typeof files> = {};
  for (const folder of DOCUMENT_FOLDERS) {
    documents[folder] = files.filter((f) => f.folder === folder);
  }

  return NextResponse.json({ unit: serializeUnit(row), documents });
}
