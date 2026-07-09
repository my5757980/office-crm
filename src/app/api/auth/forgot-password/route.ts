import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/pg";
import bcryptjs from "bcryptjs";

export async function POST(request: NextRequest) {
  const { email, newEmail, newPassword } = await request.json();

  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!newPassword) return NextResponse.json({ error: "New password is required" }, { status: 400 });
  if (newPassword.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

  const user = await queryOne<{ id: string; role: string }>(`SELECT id, role FROM users WHERE email = $1`, [email.toLowerCase()]);
  if (!user) return NextResponse.json({ error: "No account found with this email" }, { status: 404 });

  if (user.role !== "admin" && user.role !== "manager")
    return NextResponse.json({ error: "Password reset is only available for Admin and Manager accounts" }, { status: 403 });

  const setClauses: string[] = [`password = $1`];
  const setParams: unknown[] = [await bcryptjs.hash(newPassword, 12)];

  if (newEmail && newEmail.trim() !== "") {
    const emailLower = newEmail.toLowerCase().trim();
    const existing = await queryOne(`SELECT id FROM users WHERE email = $1 AND id != $2`, [emailLower, user.id]);
    if (existing) return NextResponse.json({ error: "This email is already in use" }, { status: 400 });
    setClauses.push(`email = $${setParams.length + 1}`);
    setParams.push(emailLower);
  }

  setClauses.push(`updated_at = now()`);
  setParams.push(user.id);
  await query(`UPDATE users SET ${setClauses.join(", ")} WHERE id = $${setParams.length}`, setParams);

  return NextResponse.json({ success: true });
}
