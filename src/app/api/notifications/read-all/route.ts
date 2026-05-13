import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";

export async function PATCH() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();

  await Notification.updateMany({ userId: session.user.id, read: false }, { read: true });

  return NextResponse.json({ success: true });
}
