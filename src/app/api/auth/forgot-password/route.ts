import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import bcryptjs from "bcryptjs";

export async function POST(request: NextRequest) {
  await dbConnect();
  const { email, newEmail, newPassword } = await request.json();

  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!newPassword) return NextResponse.json({ error: "New password is required" }, { status: 400 });
  if (newPassword.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return NextResponse.json({ error: "No account found with this email" }, { status: 404 });

  if (user.role !== "admin" && user.role !== "manager")
    return NextResponse.json({ error: "Password reset is only available for Admin and Manager accounts" }, { status: 403 });

  const updates: Record<string, string> = {
    password: await bcryptjs.hash(newPassword, 12),
  };

  if (newEmail && newEmail.trim() !== "") {
    const emailLower = newEmail.toLowerCase().trim();
    const existing = await User.findOne({ email: emailLower, _id: { $ne: user._id } });
    if (existing) return NextResponse.json({ error: "This email is already in use" }, { status: 400 });
    updates.email = emailLower;
  }

  await User.findByIdAndUpdate(user._id, updates);

  return NextResponse.json({ success: true });
}
