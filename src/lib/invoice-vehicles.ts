import { query, genId } from "@/lib/pg";

// One invoice can carry several vehicles (Sir, 5 Oct 2026: "Add More" on the
// invoice request). Every vehicle of such an invoice lives in invoice_vehicles,
// in order. The invoices row keeps the FIRST vehicle in its old columns and the
// TOTAL push / CNF prices, so everything that reads the invoices row alone
// (lists, reports, payments, WooCommerce, the website feed) keeps working.
// Invoices made before this change have no rows here: their one vehicle is
// read from the invoices row itself.

export interface InvoiceVehicle {
  unit: string;
  year: string;
  color: string;
  chassisNo: string;
  engineNo: string;
  transmission: string;
  fuel: string;
  pushPrice: number;
  cnfPrice: number;
}

export const MAX_VEHICLES = 50;

// The table is created on first use, like sso_nonces and app_settings: one
// cheap existence check per server instance, and the CREATE only when it is
// genuinely missing. Nothing in an existing table is touched.
let tableReady: Promise<void> | null = null;

export function ensureVehicleTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      const found = await query<{ t: string | null }>(`SELECT to_regclass('public.invoice_vehicles')::text AS t`);
      if (found[0]?.t) return;
      await query(`
        CREATE TABLE IF NOT EXISTS invoice_vehicles (
          id           varchar(24) PRIMARY KEY,
          invoice_id   varchar(24) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
          position     integer NOT NULL,
          unit         text NOT NULL DEFAULT '',
          year         text NOT NULL DEFAULT '',
          color        text NOT NULL DEFAULT '',
          chassis_no   text NOT NULL DEFAULT '',
          engine_no    text NOT NULL DEFAULT '',
          transmission text NOT NULL DEFAULT '',
          fuel         text NOT NULL DEFAULT '',
          push_price   numeric NOT NULL DEFAULT 0,
          cnf_price    numeric NOT NULL DEFAULT 0,
          created_at   timestamptz NOT NULL DEFAULT now()
        )`);
      await query(`CREATE INDEX IF NOT EXISTS idx_invoice_vehicles_invoice ON invoice_vehicles (invoice_id, position)`);
    })().catch((err) => {
      tableReady = null;
      throw err;
    });
  }
  return tableReady;
}

const text = (v: unknown): string => (v == null ? "" : String(v).trim());
const money = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const isBlank = (v: InvoiceVehicle) =>
  !v.unit && !v.year && !v.color && !v.chassisNo && !v.engineNo && !v.transmission && !v.fuel && !v.pushPrice && !v.cnfPrice;

// Cleans what the form sent: trimmed text, prices as numbers (blank = 0).
// A completely empty extra card ("Add More" pressed but nothing typed) is
// dropped; the first vehicle always stays, even empty, as it always has.
export function normalizeVehicles(input: Array<Partial<Record<keyof InvoiceVehicle, unknown>>>): InvoiceVehicle[] {
  const all = input.slice(0, MAX_VEHICLES).map((v) => ({
    unit: text(v.unit),
    year: text(v.year),
    color: text(v.color),
    chassisNo: text(v.chassisNo),
    engineNo: text(v.engineNo),
    transmission: text(v.transmission),
    fuel: text(v.fuel),
    pushPrice: money(v.pushPrice),
    cnfPrice: money(v.cnfPrice),
  }));
  const kept = all.filter((v, i) => i === 0 || !isBlank(v));
  return kept.length ? kept : [{ unit: "", year: "", color: "", chassisNo: "", engineNo: "", transmission: "", fuel: "", pushPrice: 0, cnfPrice: 0 }];
}

export function vehicleTotals(vehicles: InvoiceVehicle[]): { push: number; cnf: number } {
  return vehicles.reduce((t, v) => ({ push: t.push + v.pushPrice, cnf: t.cnf + v.cnfPrice }), { push: 0, cnf: 0 });
}

// The one vehicle of an invoice made before vehicles had their own table.
export function vehicleFromInvoiceRow(row: Record<string, unknown>): InvoiceVehicle {
  return {
    unit: text(row.unit),
    year: text(row.year),
    color: text(row.color),
    chassisNo: text(row.chassis_no),
    engineNo: text(row.engine_no),
    transmission: text(row.transmission),
    fuel: text(row.fuel),
    pushPrice: money(row.push_price),
    cnfPrice: money(row.cnf_price),
  };
}

function vehicleFromRow(row: Record<string, unknown>): InvoiceVehicle {
  return {
    unit: text(row.unit),
    year: text(row.year),
    color: text(row.color),
    chassisNo: text(row.chassis_no),
    engineNo: text(row.engine_no),
    transmission: text(row.transmission),
    fuel: text(row.fuel),
    pushPrice: money(row.push_price),
    cnfPrice: money(row.cnf_price),
  };
}

// Every vehicle on one invoice, in order. Pass the invoices row when it is
// already loaded; it is the fallback for invoices made before this change.
export async function getInvoiceVehicles(invoiceId: string, invoiceRow?: Record<string, unknown> | null): Promise<InvoiceVehicle[]> {
  await ensureVehicleTable();
  const rows = await query(`SELECT * FROM invoice_vehicles WHERE invoice_id = $1 ORDER BY position`, [invoiceId]);
  if (rows.length) return rows.map(vehicleFromRow);
  const inv = invoiceRow ?? (await query(`SELECT * FROM invoices WHERE id = $1`, [invoiceId]))[0];
  return inv ? [vehicleFromInvoiceRow(inv)] : [];
}

// Vehicles for many invoices at once (lists, the website feed). Invoices with
// no rows get their single vehicle from their own row.
export async function getVehiclesForInvoices(invoiceRows: Record<string, unknown>[]): Promise<Map<string, InvoiceVehicle[]>> {
  const out = new Map<string, InvoiceVehicle[]>();
  if (!invoiceRows.length) return out;
  await ensureVehicleTable();
  const ids = invoiceRows.map((r) => String(r.id));
  const rows = await query(`SELECT * FROM invoice_vehicles WHERE invoice_id = ANY($1) ORDER BY invoice_id, position`, [ids]);
  for (const r of rows) {
    const key = String(r.invoice_id);
    const list = out.get(key) ?? [];
    list.push(vehicleFromRow(r));
    out.set(key, list);
  }
  for (const inv of invoiceRows) {
    const key = String(inv.id);
    if (!out.has(key)) out.set(key, [vehicleFromInvoiceRow(inv)]);
  }
  return out;
}

// How many vehicles each invoice carries (only invoices with more than one are
// returned). For lists: it never throws, so a list never fails because of it.
export async function vehicleCounts(invoiceIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!invoiceIds.length) return out;
  try {
    await ensureVehicleTable();
    const rows = await query<{ invoice_id: string; n: string }>(
      `SELECT invoice_id, count(*) AS n FROM invoice_vehicles WHERE invoice_id = ANY($1) GROUP BY invoice_id HAVING count(*) > 1`,
      [invoiceIds]
    );
    for (const r of rows) out.set(r.invoice_id, Number(r.n));
  } catch {
    // no counts: every invoice simply shows its first vehicle, as before
  }
  return out;
}

// JSON for json_to_recordset(...) in the SQL below.
export function vehicleRecordset(vehicles: InvoiceVehicle[]): string {
  return JSON.stringify(vehicles.map((v, i) => ({
    id: genId(),
    position: i + 1,
    unit: v.unit,
    year: v.year,
    color: v.color,
    chassis_no: v.chassisNo,
    engine_no: v.engineNo,
    transmission: v.transmission,
    fuel: v.fuel,
    push_price: v.pushPrice,
    cnf_price: v.cnfPrice,
  })));
}

export const VEHICLE_COLUMNS =
  "id, invoice_id, position, unit, year, color, chassis_no, engine_no, transmission, fuel, push_price, cnf_price";

export const VEHICLE_RECORD_TYPE =
  "id text, position int, unit text, year text, color text, chassis_no text, engine_no text, transmission text, fuel text, push_price numeric, cnf_price numeric";

// Replaces an invoice's vehicles and keeps its own columns in step (first
// vehicle + totals). One statement, so it all happens or none of it does.
export async function saveInvoiceVehicles(invoiceId: string, vehicles: InvoiceVehicle[]): Promise<void> {
  await ensureVehicleTable();
  const first = vehicles[0];
  const totals = vehicleTotals(vehicles);
  await query(
    `WITH gone AS (DELETE FROM invoice_vehicles WHERE invoice_id = $1),
          added AS (
            INSERT INTO invoice_vehicles (${VEHICLE_COLUMNS})
            SELECT v.id, $1, v.position, v.unit, v.year, v.color, v.chassis_no, v.engine_no, v.transmission, v.fuel, v.push_price, v.cnf_price
            FROM json_to_recordset($2::json) AS v(${VEHICLE_RECORD_TYPE})
          )
     UPDATE invoices
        SET unit = $3, year = $4, color = $5, chassis_no = $6, engine_no = $7, transmission = $8, fuel = $9,
            push_price = $10, cnf_price = $11, updated_at = now()
      WHERE id = $1`,
    [invoiceId, vehicleRecordset(vehicles), first.unit, first.year, first.color, first.chassisNo, first.engineNo,
     first.transmission, first.fuel, totals.push, totals.cnf]
  );
}
