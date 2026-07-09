import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/pg";

export async function PATCH() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await query(`UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`, [session.user.id]);

  return NextResponse.json({ success: true });
}
