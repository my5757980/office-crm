import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import ChatMessage from "@/models/ChatMessage";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const withId = req.nextUrl.searchParams.get("with");
  if (!withId) return NextResponse.json({ error: "with param required" }, { status: 400 });

  await dbConnect();

  const myId    = new mongoose.Types.ObjectId(session.user.id);
  const otherId = new mongoose.Types.ObjectId(withId);

  // Mark incoming messages as read
  await ChatMessage.updateMany({ from: otherId, to: myId, read: false }, { read: true });

  const messages = await ChatMessage.find({
    $or: [
      { from: myId,    to: otherId },
      { from: otherId, to: myId    },
    ],
  })
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json(messages.map(m => ({
    _id:       m._id.toString(),
    from:      m.from.toString(),
    to:        m.to.toString(),
    text:      m.text,
    read:      m.read,
    createdAt: m.createdAt,
  })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { to, text } = await req.json();
  if (!to || !text?.trim()) return NextResponse.json({ error: "to and text required" }, { status: 400 });

  await dbConnect();

  const msg = await ChatMessage.create({
    from: new mongoose.Types.ObjectId(session.user.id),
    to:   new mongoose.Types.ObjectId(to),
    text: text.trim(),
  });

  return NextResponse.json({ _id: msg._id.toString(), ok: true });
}
