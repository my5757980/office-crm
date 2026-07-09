import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne, genId } from "@/lib/pg";
import { serializeChatMessage } from "@/lib/serialize";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const withId = req.nextUrl.searchParams.get("with");
  if (!withId) return NextResponse.json({ error: "with param required" }, { status: 400 });

  const myId = session.user.id;

  // Mark incoming messages as read
  await query(`UPDATE chat_messages SET read = true WHERE from_user = $1 AND to_user = $2 AND read = false`, [withId, myId]);

  const rows = await query(
    `SELECT * FROM chat_messages WHERE (from_user = $1 AND to_user = $2) OR (from_user = $2 AND to_user = $1) ORDER BY created_at ASC`,
    [myId, withId]
  );

  return NextResponse.json(rows.map(serializeChatMessage));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { to, text } = await req.json();
  if (!to || !text?.trim()) return NextResponse.json({ error: "to and text required" }, { status: 400 });

  const id = genId();
  await queryOne(
    `INSERT INTO chat_messages (id, from_user, to_user, text) VALUES ($1, $2, $3, $4)`,
    [id, session.user.id, to, text.trim()]
  );

  return NextResponse.json({ _id: id, ok: true });
}
