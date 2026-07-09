import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/pg";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await query(`UPDATE users SET last_seen = now() WHERE id = $1`, [session.user.id]);
  return NextResponse.json({ ok: true });
}
