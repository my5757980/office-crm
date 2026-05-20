import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import ChatMessage from "@/models/ChatMessage";
import mongoose from "mongoose";

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

  await dbConnect();

  const roles = allowedRoles(session.user.role);
  const users = await User.find({ role: { $in: roles }, isActive: true })
    .select("name role lastSeen")
    .lean();

  const myId = new mongoose.Types.ObjectId(session.user.id);
  const now   = Date.now();

  const usersWithMeta = await Promise.all(users.map(async u => {
    const uid = u._id as mongoose.Types.ObjectId;
    const unread = await ChatMessage.countDocuments({ from: uid, to: myId, read: false });
    return {
      _id:     uid.toString(),
      name:    u.name,
      role:    u.role,
      online:  u.lastSeen ? (now - new Date(u.lastSeen).getTime()) < ONLINE_THRESHOLD_MS : false,
      unread,
    };
  }));

  return NextResponse.json(usersWithMeta);
}
