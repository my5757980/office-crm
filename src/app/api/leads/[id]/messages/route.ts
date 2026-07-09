import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne, genId } from "@/lib/pg";
import { messageSchema } from "@/lib/validations";
import { serializeMessage } from "@/lib/serialize";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const lead = await queryOne<{ created_by: string }>(`SELECT created_by FROM leads WHERE id = $1`, [id]);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isElevated = ["admin", "manager", "super_admin"].includes(session.user.role);
  const isOwner = lead.created_by === session.user.id;
  if (!isElevated && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const row = await queryOne(
    `INSERT INTO messages (id, lead_id, user_id, user_name, message) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [genId(), id, session.user.id, session.user.name, parsed.data.message]
  );

  return NextResponse.json({ message: row ? serializeMessage(row) : null }, { status: 201 });
}
