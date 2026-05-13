import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import bcryptjs from "bcryptjs";
import { z } from "zod";

const CAN_MANAGE = ["admin", "manager", "super_admin"];

const createSchema = z.object({
  name:     z.string().min(1),
  email:    z.string().email(),
  password: z.string().min(8),
  role:     z.enum(["user", "super_admin"]),
});

function getAllowedRole(creatorRole: string): string {
  if (creatorRole === "admin" || creatorRole === "manager") return "super_admin";
  if (creatorRole === "super_admin") return "user";
  return "";
}

export async function GET() {
  const session = await auth();
  if (!session || !CAN_MANAGE.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const users = await User.find({}).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ users: JSON.parse(JSON.stringify(users)) });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !CAN_MANAGE.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const allowedRole = getAllowedRole(session.user.role);
  if (!allowedRole) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const body = await request.json();
  const parsed = createSchema.safeParse({ ...body, role: allowedRole });
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 400 });

  const hashed = await bcryptjs.hash(parsed.data.password, 12);
  const user = await User.create({
    name:     parsed.data.name,
    email:    parsed.data.email.toLowerCase(),
    password: hashed,
    role:     allowedRole,
  });

  const { password: _, ...safe } = user.toObject();
  return NextResponse.json({ user: safe }, { status: 201 });
}
