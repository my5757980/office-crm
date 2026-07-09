import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/pg";

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

// Who a given role can chat with
function allowedRoles(role: string): string[] {
  if (role === "user")        return ["manager", "super_admin"];
  if (role === "manager")     return ["user", "super_admin"];
  if (role === "super_admin") return ["user", "manager"];
  return [];
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = allowedRoles(session.user.role);
  const myId = session.user.id;
  const now = Date.now();

  const users = await query<{ id: string; name: string; role: string; last_seen: string | null; unread: string }>(
    `SELECT u.id, u.name, u.role, u.last_seen,
            (SELECT count(*) FROM chat_messages c WHERE c.from_user = u.id AND c.to_user = $1 AND c.read = false) AS unread
     FROM users u WHERE u.role = ANY($2) AND u.is_active = true`,
    [myId, roles]
  );

  const usersWithMeta = users.map(u => ({
    _id: u.id,
    name: u.name,
    role: u.role,
    online: u.last_seen ? (now - new Date(u.last_seen).getTime()) < ONLINE_THRESHOLD_MS : false,
    unread: Number(u.unread),
  }));

  return NextResponse.json(usersWithMeta);
}
