import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/pg";
import { serializeUser } from "@/lib/serialize";
import bcryptjs from "bcryptjs";

type RouteContext = { params: Promise<{ id: string }> };

// Who can reset whose password:
// admin   → manager, super_admin, user
// manager → super_admin, user
// Nobody  → admin (admins use /forgot-password for self-service only)
const RESET_ALLOWED: Record<string, string[]> = {
  admin:   ["manager", "super_admin", "user"],
  manager: ["super_admin", "user"],
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const target = await queryOne<{ id: string; role: string }>(`SELECT id, role FROM users WHERE id = $1`, [id]);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const setClauses: string[] = [];
  const setParams: unknown[] = [];
  const setP = (v: unknown) => { setParams.push(v); return `$${setParams.length}`; };

  if ("role" in body) setClauses.push(`role = ${setP(body.role)}`);
  if ("isActive" in body) setClauses.push(`is_active = ${setP(body.isActive)}`);

  if ("password" in body) {
    const allowed = RESET_ALLOWED[session.user.role] ?? [];
    if (!allowed.includes(target.role)) {
      return NextResponse.json(
        { error: "You are not allowed to reset this user's password" },
        { status: 403 }
      );
    }
    if (!body.password || body.password.length < 6)
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    setClauses.push(`password = ${setP(await bcryptjs.hash(body.password, 12))}`);
  }

  if (setClauses.length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  setClauses.push(`updated_at = now()`);
  const row = await queryOne<Record<string, unknown>>(
    `UPDATE users SET ${setClauses.join(", ")} WHERE id = ${setP(id)} RETURNING *`,
    setParams
  );
  return NextResponse.json({ user: row ? serializeUser(row) : null });
}
