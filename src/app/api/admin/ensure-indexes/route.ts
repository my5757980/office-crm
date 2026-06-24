import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Lead from "@/models/Lead";
import Invoice from "@/models/Invoice";
import Unit from "@/models/Unit";
import UnitFile from "@/models/UnitFile";
import Payment from "@/models/Payment";

export const runtime = "nodejs";
export const maxDuration = 60;

// One-time / safe to re-run: builds the sort indexes the app relies on.
// Creating indexes is non-destructive. Needed because some collections predate
// their createdAt indexes, causing slow scans + disk sorts (and the earlier
// "Sort exceeded memory limit" crash). Each build is isolated so one conflict
// can't fail the rest.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "super_admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();

  const jobs: [string, () => Promise<unknown>][] = [
    ["invoices.createdAt",            () => Invoice.collection.createIndex({ createdAt: -1 })],
    ["units.createdAt",               () => Unit.collection.createIndex({ createdAt: -1 })],
    ["unitfiles.unitId_uploadedAt",   () => UnitFile.collection.createIndex({ unitId: 1, uploadedAt: 1 })],
    ["leads.createdAt",               () => Lead.collection.createIndex({ createdAt: -1 })],
    ["payments.invoiceId_receivedDate", () => Payment.collection.createIndex({ invoiceId: 1, receivedDate: 1 })],
  ];

  const results: Record<string, string> = {};
  for (const [name, fn] of jobs) {
    try {
      await fn();
      results[name] = "ok";
    } catch (e) {
      results[name] = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({ ok: true, results });
}
