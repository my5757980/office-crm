import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Lead from "@/models/Lead";
import Invoice from "@/models/Invoice";
import Unit from "@/models/Unit";
import UnitFile from "@/models/UnitFile";
import UnitFinancial from "@/models/UnitFinancial";
import Payment from "@/models/Payment";
import Message from "@/models/Message";
import Notification from "@/models/Notification";
import User from "@/models/User";

export const runtime = "nodejs";
export const maxDuration = 60;

// One-time / safe to re-run: builds the indexes declared in the schemas on the
// actual database. Creating indexes is non-destructive. Needed because some
// collections predate their createdAt indexes, causing slow in-memory/disk
// sorts (and the earlier "Sort exceeded memory limit" crash).
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "super_admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();

  // Ensure useful sort indexes exist (idempotent)
  await Promise.all([
    Invoice.collection.createIndex({ createdAt: -1 }),
    Unit.collection.createIndex({ createdAt: -1 }),
    UnitFile.collection.createIndex({ unitId: 1, uploadedAt: 1 }),
    Lead.collection.createIndex({ createdAt: -1 }),
    Payment.collection.createIndex({ invoiceId: 1, receivedDate: 1 }),
    Message.collection.createIndex({ leadId: 1, createdAt: 1 }),
    Notification.collection.createIndex({ userId: 1, createdAt: -1 }),
    User.collection.createIndex({ createdAt: -1 }),
    UnitFinancial.collection.createIndex({ unitId: 1 }),
  ]);

  // Also sync any other schema-declared indexes
  await Promise.all([
    Lead.createIndexes(),
    Invoice.createIndexes(),
    Unit.createIndexes(),
    UnitFile.createIndexes(),
    Payment.createIndexes(),
  ]);

  const indexes = {
    invoices: await Invoice.collection.indexes(),
    units: await Unit.collection.indexes(),
    unitfiles: await UnitFile.collection.indexes(),
  };

  return NextResponse.json({ ok: true, message: "Indexes ensured", indexes });
}
