import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import bcryptjs from "bcryptjs";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["admin", "manager"].includes(session.user.role))
    return NextResponse.json({ error: "Only Admin and Manager can update their profile" }, { status: 403 });

  await dbConnect();

  const { currentPassword, newEmail, newPassword } = await request.json();

  if (!currentPassword)
    return NextResponse.json({ error: "Current password is required" }, { status: 400 });

  if (!newEmail && !newPassword)
    return NextResponse.json({ error: "Provide a new email or new password" }, { status: 400 });

  const user = await User.findById(session.user.id).select("+password");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const valid = await bcryptjs.compare(currentPassword, user.password as string);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  const updates: Record<string, string> = {};

  if (newEmail) {
    const emailLower = newEmail.toLowerCase().trim();
    const existing = await User.findOne({ email: emailLower, _id: { $ne: user._id } });
    if (existing) return NextResponse.json({ error: "This email is already in use" }, { status: 400 });
    updates.email = emailLower;
  }

  if (newPassword) {
    if (newPassword.length < 8)
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    updates.password = await bcryptjs.hash(newPassword, 12);
  }

  await User.findByIdAndUpdate(user._id, updates);

  return NextResponse.json({ success: true, emailChanged: !!newEmail, passwordChanged: !!newPassword });
}
