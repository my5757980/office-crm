import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Lead from "@/models/Lead";
import Message from "@/models/Message";
import { messageSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const { id } = await params;

  const lead = await Lead.findById(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isElevated = ["admin", "manager", "super_admin"].includes(session.user.role);
  const isOwner = lead.createdBy.toString() === session.user.id;
  if (!isElevated && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const message = await Message.create({
    leadId: id,
    userId: session.user.id,
    userName: session.user.name,
    message: parsed.data.message,
  });

  return NextResponse.json({ message }, { status: 201 });
}
