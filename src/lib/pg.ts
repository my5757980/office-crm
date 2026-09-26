import { randomBytes } from "crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export function genId(): string {
  return randomBytes(12).toString("hex");
}

const DATABASE_URL = process.env.DATABASE_URL;

declare global {
  // eslint-disable-next-line no-var
  var neonSql: NeonQueryFunction<false, false> | undefined;
}

function getSql(): NeonQueryFunction<false, false> {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in environment variables");
  }

  if (!global.neonSql) {
    global.neonSql = neon(DATABASE_URL);
  }

  return global.neonSql;
}

// --- CRM schema self-heal (this deployment's own database) --------------------
// This CRM runs against its own Neon database, which predates the website
// integration and the US-invoice work, so it can be missing the columns/table
// that the newer code reads (invoices.consignee_email / wc_customer_id /
// wc_order_id, unit_financials.auction_fee / parts / cc_vanning / doc, and the
// app_settings table). Every statement below is additive and idempotent, so no
// existing row or column is ever changed. It runs at most once per instance: one
// cheap existence check, and the ALTERs only when the column is genuinely absent.
let crmSchemaReady: Promise<void> | null = null;

async function ensureCrmSchema(sql: NeonQueryFunction<false, false>): Promise<void> {
  const existing = await sql.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'consignee_email' LIMIT 1`
  );
  if ((existing as unknown[]).length) return;
  await sql.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS consignee_email text`);
  await sql.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS wc_customer_id integer`);
  await sql.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS wc_order_id integer`);
  await sql.query(`ALTER TABLE unit_financials ADD COLUMN IF NOT EXISTS auction_fee numeric DEFAULT 0`);
  await sql.query(`ALTER TABLE unit_financials ADD COLUMN IF NOT EXISTS parts numeric DEFAULT 0`);
  await sql.query(`ALTER TABLE unit_financials ADD COLUMN IF NOT EXISTS cc_vanning numeric DEFAULT 0`);
  await sql.query(`ALTER TABLE unit_financials ADD COLUMN IF NOT EXISTS doc numeric DEFAULT 0`);
  await sql.query(`CREATE TABLE IF NOT EXISTS app_settings (key text PRIMARY KEY, value text)`);
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const sql = getSql();
  if (!crmSchemaReady) {
    crmSchemaReady = ensureCrmSchema(sql).catch((err) => {
      crmSchemaReady = null;
      throw err;
    });
  }
  await crmSchemaReady;
  const rows = await sql.query(text, params as unknown[]);
  return rows as unknown as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
