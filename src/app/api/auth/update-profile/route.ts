import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/pg";
import bcryptjs from "bcryptjs";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["admin", "manager"].includes(session.user.role))
    return NextResponse.json({ error: "Only Admin and Manager can update their profile" }, { status: 403 });

  const { currentPassword, newEmail, newPassword } = await request.json();

  if (!currentPassword)
    return NextResponse.json({ error: "Current password is required" }, { status: 400 });

  if (!newEmail && !newPassword)
    return NextResponse.json({ error: "Provide a new email or new password" }, { status: 400 });

  const user = await queryOne<{ id: string; password: string }>(`SELECT id, password FROM users WHERE id = $1`, [session.user.id]);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const valid = await bcryptjs.compare(currentPassword, user.password);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  const setClauses: string[] = [];
  const setParams: unknown[] = [];
  const setP = (v: unknown) => { setParams.push(v); return `$${setParams.length}`; };

  if (newEmail) {
    const emailLower = newEmail.toLowerCase().trim();
    const existing = await queryOne(`SELECT id FROM users WHERE email = $1 AND id != $2`, [emailLower, user.id]);
    if (existing) return NextResponse.json({ error: "This email is already in use" }, { status: 400 });
    setClauses.push(`email = ${setP(emailLower)}`);
  }

  if (newPassword) {
    if (newPassword.length < 8)
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    setClauses.push(`password = ${setP(await bcryptjs.hash(newPassword, 12))}`);
  }

  setClauses.push(`updated_at = now()`);
  await query(`UPDATE users SET ${setClauses.join(", ")} WHERE id = ${setP(user.id)}`, setParams);

  return NextResponse.json({ success: true, emailChanged: !!newEmail, passwordChanged: !!newPassword });
}
