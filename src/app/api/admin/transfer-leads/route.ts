import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/pg";

const CAN_MANAGE = ["admin", "manager"];
const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !CAN_MANAGE.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const { fromUserId, toUserId } = body;

  if (!fromUserId || !toUserId)
    return NextResponse.json({ error: "fromUserId and toUserId are required" }, { status: 400 });
  if (fromUserId === toUserId)
    return NextResponse.json({ error: "Cannot transfer to the same agent" }, { status: 400 });
  if (!OBJECT_ID_RE.test(fromUserId) || !OBJECT_ID_RE.test(toUserId))
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });

  const [fromUser, toUser] = await Promise.all([
    queryOne<{ id: string; role: string; name: string }>(`SELECT id, role, name FROM users WHERE id = $1`, [fromUserId]),
    queryOne<{ id: string; role: string; name: string; is_active: boolean }>(`SELECT id, role, name, is_active FROM users WHERE id = $1`, [toUserId]),
  ]);

  if (!fromUser || fromUser.role !== "user")
    return NextResponse.json({ error: "Source user must be an agent" }, { status: 400 });
  if (!toUser || toUser.role !== "user" || !toUser.is_active)
    return NextResponse.json({ error: "Target agent not found or inactive" }, { status: 400 });

  const [leadsRes, dupeRes, invoicesRes, unitsRes] = await Promise.all([
    query(`UPDATE leads SET created_by = $1 WHERE created_by = $2 RETURNING id`, [toUserId, fromUserId]),
    query(`UPDATE leads SET duplicate_attempt_by = $1 WHERE duplicate_attempt_by = $2 RETURNING id`, [toUserId, fromUserId]),
    query(`UPDATE invoices SET created_by = $1 WHERE created_by = $2 RETURNING id`, [toUserId, fromUserId]),
    query(`UPDATE units SET created_by = $1 WHERE created_by = $2 RETURNING id`, [toUserId, fromUserId]),
  ]);

  return NextResponse.json({
    ok: true,
    from: fromUser.name,
    to: toUser.name,
    transferred: {
      leads:    leadsRes.length,
      invoices: invoicesRes.length,
      units:    unitsRes.length,
      duplicateAttempts: dupeRes.length,
    },
  });
}
