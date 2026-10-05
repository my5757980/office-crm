import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/pg";
import { getRecoveryKeyHash, setRecoveryKey, MIN_RECOVERY_KEY_LENGTH } from "@/lib/recovery-key";

// Admin only. The recovery key unlocks the public Reset Credentials page for every Admin and
// Manager account, so only an admin may see whether it is set or change it.

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ configured: !!(await getRecoveryKeyHash()) });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Only an Admin can set the recovery key" }, { status: 403 });

  const { currentPassword, recoveryKey } = await request.json();
  if (!currentPassword)
    return NextResponse.json({ error: "Current password is required" }, { status: 400 });
  const key = typeof recoveryKey === "string" ? recoveryKey.trim() : "";
  if (key.length < MIN_RECOVERY_KEY_LENGTH)
    return NextResponse.json({ error: `The recovery key must be at least ${MIN_RECOVERY_KEY_LENGTH} characters` }, { status: 400 });

  const user = await queryOne<{ password: string }>(`SELECT password FROM users WHERE id = $1`, [session.user.id]);
  if (!user || !(await bcryptjs.compare(currentPassword, user.password)))
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  await setRecoveryKey(key);
  return NextResponse.json({ success: true });
}
