import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const SEED_SECRET = "sbk-seed-2026-once";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== SEED_SECRET)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const db = mongoose.connection.db!;
  const col = db.collection("users");

  const users = [
    { name: "Admin",   email: "admin@sbk.com",   password: "Admin@SBK1",   role: "admin" },
    { name: "Manager", email: "manager@sbk.com", password: "Manager@SBK1", role: "manager" },
  ];

  const results: string[] = [];
  for (const u of users) {
    const exists = await col.findOne({ email: u.email });
    if (exists) { results.push(`already exists: ${u.email}`); continue; }
    const hashed = await bcrypt.hash(u.password, 12);
    await col.insertOne({ name: u.name, email: u.email, password: hashed, role: u.role, createdAt: new Date(), updatedAt: new Date() });
    results.push(`created: ${u.email} (${u.role})`);
  }

  return NextResponse.json({ ok: true, results });
}
