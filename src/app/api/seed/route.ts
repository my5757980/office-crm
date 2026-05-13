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
    const hashed = await bcrypt.hash(u.password, 12);
    const res = await col.updateOne(
      { email: u.email },
      { $set: { name: u.name, password: hashed, role: u.role, isActive: true, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    results.push(res.upsertedCount ? `created: ${u.email} (${u.role})` : `updated: ${u.email} (isActive=true)`);
  }

  return NextResponse.json({ ok: true, results });
}
