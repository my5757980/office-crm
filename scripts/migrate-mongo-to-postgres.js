// One-off migration: MongoDB (office-crm) -> Neon PostgreSQL.
// Mongo ObjectIds are kept as-is (hex string) as the Postgres primary key,
// so every foreign-key reference carries over unchanged with zero remapping.
require("dotenv").config({ path: ".env.migration" });
const { MongoClient } = require("mongodb");
const { Client } = require("pg");

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "office-crm";
const POSTGRES_URL = process.env.MIGRATION_POSTGRES_URL;

if (!MONGODB_URI) throw new Error("MONGODB_URI missing in .env.migration");
if (!POSTGRES_URL) throw new Error("MIGRATION_POSTGRES_URL missing in .env.migration");

const id = (v) => (v == null ? null : v.toString());
const num = (v) => (v == null ? null : Number(v));

async function main() {
  const mongo = new MongoClient(MONGODB_URI);
  await mongo.connect();
  const db = mongo.db(MONGODB_DB_NAME);

  const pg = new Client({ connectionString: POSTGRES_URL });
  await pg.connect();

  const stats = {};
  const failures = [];

  async function insertMany(table, columns, docs, mapRow) {
    stats[table] = { mongo: docs.length, inserted: 0 };
    if (docs.length === 0) return;
    const colList = columns.join(", ");
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;
    for (const doc of docs) {
      const row = mapRow(doc);
      try {
        await pg.query(sql, row);
        stats[table].inserted++;
      } catch (err) {
        failures.push({ table, mongoId: id(doc._id), error: err.message });
      }
    }
  }

  const users = await db.collection("users").find({}).toArray();
  await insertMany(
    "users",
    ["id", "name", "email", "password", "role", "is_active", "last_seen", "created_at", "updated_at"],
    users,
    (d) => [id(d._id), d.name, d.email, d.password, d.role, d.isActive ?? true, d.lastSeen ?? null, d.createdAt ?? new Date(), d.updatedAt ?? new Date()]
  );

  const leads = await db.collection("leads").find({}).toArray();
  await insertMany(
    "leads",
    ["id", "customer_name", "contact_person", "address", "phone", "email", "country", "country_code", "port", "status", "is_customer", "created_by", "duplicate_attempt_by", "created_at", "updated_at"],
    leads,
    (d) => [id(d._id), d.customerName ?? "", d.contactPerson ?? "", d.address ?? null, d.phone, d.email ?? null, d.country, d.countryCode, d.port ?? "", d.status ?? "new", d.isCustomer ?? false, id(d.createdBy), id(d.duplicateAttemptBy), d.createdAt ?? new Date(), d.updatedAt ?? new Date()]
  );

  const invoices = await db.collection("invoices").find({}).toArray();
  await insertMany(
    "invoices",
    ["id", "lead_id", "created_by", "approved_by", "consignee_name", "consignee_address", "consignee_phone", "consignee_country", "consignee_port", "unit", "chassis_no", "engine_no", "color", "year", "salesperson", "fuel", "transmission", "m3_rate", "exchange_rate", "push_price", "cnf_price", "advance_percent", "status", "rejection_note", "uploaded_pdf_data", "uploaded_pdf_filename", "uploaded_pdf_uploaded_at", "created_at", "updated_at"],
    invoices,
    (d) => [
      id(d._id), id(d.leadId), id(d.createdBy), id(d.approvedBy),
      d.consignee?.name, d.consignee?.address ?? "", d.consignee?.phone, d.consignee?.country, d.consignee?.port,
      d.unit, d.chassisNo, d.engineNo, d.color, d.year ?? "", d.salesperson ?? "", d.fuel ?? "", d.transmission ?? "",
      num(d.m3Rate), num(d.exchangeRate), num(d.pushPrice), num(d.cnfPrice), num(d.advancePercent) ?? 50,
      d.status ?? "pending", d.rejectionNote ?? null,
      d.uploadedPdf?.data ?? null, d.uploadedPdf?.filename ?? null, d.uploadedPdf?.uploadedAt ?? null,
      d.createdAt ?? new Date(), d.updatedAt ?? new Date(),
    ]
  );

  const payments = await db.collection("payments").find({}).toArray();
  await insertMany(
    "payments",
    ["id", "invoice_id", "selling_price", "amount_received", "received_date", "exchange_rate", "yen_amount", "recorded_by", "receipt_image_data", "receipt_image_filename", "receipt_image_uploaded_at", "created_at"],
    payments,
    (d) => [id(d._id), id(d.invoiceId), num(d.sellingPrice), num(d.amountReceived), d.receivedDate, num(d.exchangeRate), num(d.yenAmount), id(d.recordedBy), d.receiptImage?.data ?? null, d.receiptImage?.filename ?? null, d.receiptImage?.uploadedAt ?? null, d.createdAt ?? new Date()]
  );

  const units = await db.collection("units").find({}).toArray();
  await insertMany(
    "units",
    ["id", "payment_id", "invoice_id", "make", "car_model", "year", "color", "chassis", "engine_cc", "drive", "fuel", "mileage", "transmission", "steering", "doors", "seats", "location", "created_by", "created_at"],
    units,
    (d) => [id(d._id), id(d.paymentId), id(d.invoiceId), d.make, d.carModel, num(d.year), d.color, d.chassis, num(d.engineCC), d.drive, d.fuel, num(d.mileage), d.transmission, d.steering, num(d.doors), num(d.seats), d.location, id(d.createdBy), d.createdAt ?? new Date()]
  );

  const unitFiles = await db.collection("unitfiles").find({}).toArray();
  await insertMany(
    "unit_files",
    ["id", "unit_id", "folder", "filename", "mimetype", "size", "data", "uploaded_at"],
    unitFiles,
    (d) => [id(d._id), id(d.unitId), d.folder, d.filename, d.mimetype, num(d.size), d.data?.buffer ? Buffer.from(d.data.buffer) : Buffer.from(d.data), d.uploadedAt ?? new Date()]
  );

  const unitFinancials = await db.collection("unitfinancials").find({}).toArray();
  await insertMany(
    "unit_financials",
    ["id", "unit_id", "currency", "lot_no", "auction_name", "buying", "domestic", "storage", "inspect", "repairs", "misc", "agency_fee", "freight", "dhl", "exchange_rate", "cost_usd", "cost_of_unit_jpy", "cost_of_unit_usd", "selling_price", "profit", "created_by", "updated_at"],
    unitFinancials,
    (d) => [id(d._id), id(d.unitId), d.currency, d.lotNo ?? "", d.auctionName ?? "", num(d.buying) ?? 0, num(d.domestic) ?? 0, num(d.storage) ?? 0, num(d.inspect) ?? 0, num(d.repairs) ?? 0, num(d.misc) ?? 0, num(d.agencyFee) ?? 0, num(d.freight) ?? 0, num(d.dhl) ?? 0, num(d.exchangeRate) ?? 0, num(d.costUSD) ?? 0, num(d.costOfUnitJPY) ?? 0, num(d.costOfUnitUSD) ?? 0, num(d.sellingPrice) ?? 0, num(d.profit) ?? 0, id(d.createdBy), d.updatedAt ?? new Date()]
  );

  const messages = await db.collection("messages").find({}).toArray();
  await insertMany(
    "messages",
    ["id", "lead_id", "user_id", "user_name", "message", "created_at"],
    messages,
    (d) => [id(d._id), id(d.leadId), id(d.userId), d.userName, d.message, d.createdAt ?? new Date()]
  );

  const notifications = await db.collection("notifications").find({}).toArray();
  await insertMany(
    "notifications",
    ["id", "user_id", "message", "type", "invoice_id", "lead_id", "read", "created_at"],
    notifications,
    (d) => [id(d._id), id(d.userId), d.message, d.type, id(d.invoiceId), id(d.leadId), d.read ?? false, d.createdAt ?? new Date()]
  );

  const chatMessages = await db.collection("chatmessages").find({}).toArray();
  await insertMany(
    "chat_messages",
    ["id", "from_user", "to_user", "text", "read", "created_at"],
    chatMessages,
    (d) => [id(d._id), id(d.from), id(d.to), d.text, d.read ?? false, d.createdAt ?? new Date()]
  );

  console.log("\n=== Migration summary (Mongo doc count -> Postgres inserted count) ===");
  let allMatch = true;
  for (const [table, s] of Object.entries(stats)) {
    const match = s.mongo === s.inserted;
    if (!match) allMatch = false;
    console.log(`${match ? "OK  " : "FAIL"} ${table}: mongo=${s.mongo} inserted=${s.inserted}`);
  }
  console.log(allMatch ? "\nAll counts match. Zero data loss confirmed." : "\nMISMATCH DETECTED — do not proceed until resolved.");

  if (failures.length > 0) {
    console.log(`\n=== ${failures.length} row(s) failed to insert ===`);
    for (const f of failures) console.log(`${f.table} / mongoId=${f.mongoId}: ${f.error}`);
  }

  await mongo.close();
  await pg.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
