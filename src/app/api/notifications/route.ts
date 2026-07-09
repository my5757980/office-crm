import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/pg";
import { serializeNotification } from "@/lib/serialize";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [session.user.id]
  );

  const notifications = rows.map(serializeNotification);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json({ notifications, unreadCount });
}
