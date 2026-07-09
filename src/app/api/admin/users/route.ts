import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne, genId } from "@/lib/pg";
import { serializeUser } from "@/lib/serialize";
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

  const rows = await query(`SELECT * FROM users ORDER BY created_at DESC`);
  return NextResponse.json({ users: rows.map(serializeUser) });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !CAN_MANAGE.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const allowedRole = getAllowedRole(session.user.role);
  if (!allowedRole) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createSchema.safeParse({ ...body, role: allowedRole });
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await queryOne(`SELECT id FROM users WHERE email = $1`, [parsed.data.email.toLowerCase()]);
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 400 });

  const hashed = await bcryptjs.hash(parsed.data.password, 12);
  const row = await queryOne(
    `INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [genId(), parsed.data.name, parsed.data.email.toLowerCase(), hashed, allowedRole]
  );

  return NextResponse.json({ user: row ? serializeUser(row) : null }, { status: 201 });
}
