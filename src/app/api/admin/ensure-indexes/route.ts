import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Postgres indexes are declared in the table DDL (created at migration time),
// so there's nothing left to build here — kept as a no-op for backward compat
// with anything that still calls this endpoint.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "super_admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ ok: true, results: { info: "indexes are defined in the Postgres schema; nothing to do" } });
}
