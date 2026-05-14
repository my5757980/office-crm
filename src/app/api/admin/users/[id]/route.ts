import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
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

  await dbConnect();
  const { id } = await params;
  const body = await request.json();

  const target = await User.findById(id);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};

  if ("role" in body) updates.role = body.role;
  if ("isActive" in body) updates.isActive = body.isActive;

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
    updates.password = await bcryptjs.hash(body.password, 12);
  }

  const user = await User.findByIdAndUpdate(id, updates, { new: true }).lean();
  return NextResponse.json({ user });
}
