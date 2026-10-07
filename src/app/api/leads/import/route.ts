import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, genId } from "@/lib/pg";
import ExcelJS from "exceljs";
import countriesPorts from "@/data/countries_ports.json";
import { LEAD_TEMPLATE_HEADERS } from "@/lib/lead-template";

export const runtime = "nodejs";

// Agents (role "user") upload their own leads; the Supervisor imports leads
// that it later assigns to agents by country (BulkLeadTools).
const CAN_IMPORT = ["super_admin", "user"];
const MAX_ROWS = 2000;

type CountryData = { code: string; ports: string[] };
const cpData = countriesPorts as Record<string, CountryData>;

// case-insensitive country lookup → returns the canonical key + data
function resolveCountry(input: string): { name: string; data: CountryData } | null {
  const t = input.trim().toLowerCase();
  for (const key of Object.keys(cpData)) {
    if (key.toLowerCase() === t) return { name: key, data: cpData[key] };
  }
  return null;
}

function cellStr(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object" && "text" in v) return String((v as { text: string }).text).trim();
  if (typeof v === "object" && "result" in v) return String((v as { result: unknown }).result ?? "").trim();
  if (typeof v === "object" && "richText" in v) return (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("").trim();
  return String(v).trim();
}

// The same shape the lead form saves: "+" and the digits.
function cleanPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits ? "+" + digits : "";
}

const headingKey = (s: string) => s.toLowerCase().replace(/\*/g, "").replace(/\s+/g, " ").trim();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_IMPORT.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden — only agents and the Supervisor can import leads" }, { status: 403 });

  // One time for the whole upload: every lead in it gets this date.
  const uploadedAt = new Date();

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(buffer as any);
  } catch {
    return NextResponse.json({ error: "Could not read the Excel file. Use the provided template (.xlsx)." }, { status: 400 });
  }

  const ws = wb.worksheets[0];
  if (!ws) return NextResponse.json({ error: "Excel file has no sheet" }, { status: 400 });

  // Strict format: every template heading must be in row 1 (any order).
  const colIndex: Record<string, number> = {};
  ws.getRow(1).eachCell((cell, col) => {
    const key = headingKey(cellStr(cell.value));
    if (key && !colIndex[key]) colIndex[key] = col;
  });
  if (!colIndex["customer name"] && colIndex["company name"]) colIndex["customer name"] = colIndex["company name"];
  const missing = LEAD_TEMPLATE_HEADERS.filter((h) => !colIndex[headingKey(h)]);
  if (missing.length) {
    return NextResponse.json({
      error: `These column headings are missing in row 1: ${missing.join(", ")}. Download the template and keep its headings as they are.`,
    }, { status: 400 });
  }
  const at = (h: string) => colIndex[headingKey(h)];

  if (ws.rowCount - 1 > MAX_ROWS) {
    return NextResponse.json({ error: `Too many rows (${ws.rowCount - 1}). Upload at most ${MAX_ROWS} leads per file.` }, { status: 400 });
  }

  const skipped: { row: number; reason: string }[] = [];
  const rows: { row: number; contactPerson: string; customerName: string; phone: string; email: string; country: string; countryCode: string; port: string; address: string }[] = [];
  const phonesInFile = new Set<string>();

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const get = (h: string) => cellStr(row.getCell(at(h)).value);
    const contactPerson = get("Contact Person");
    const customerName  = get("Customer Name");
    const phoneRaw      = get("Phone");
    const email         = get("Email");
    const countryRaw    = get("Country");
    const portRaw       = get("Port");
    const address       = get("Address");

    // skip fully-empty rows + the template's example row
    if (!contactPerson && !customerName && !phoneRaw && !email && !countryRaw && !portRaw && !address) continue;
    if (/example/i.test(contactPerson) || /example/i.test(customerName)) continue;

    // Contact Person OR Customer Name, Phone and Country are needed for a lead;
    // anything else left blank simply stays blank.
    if (!contactPerson && !customerName) { skipped.push({ row: r, reason: "Missing Contact Person / Customer Name" }); continue; }
    const phone = cleanPhone(phoneRaw);
    if (!phone)                { skipped.push({ row: r, reason: "Missing Phone" }); continue; }
    if (phone.length < 7)      { skipped.push({ row: r, reason: `Phone too short (${phoneRaw})` }); continue; }
    if (!countryRaw)           { skipped.push({ row: r, reason: "Missing Country" }); continue; }
    const resolved = resolveCountry(countryRaw);
    if (!resolved)             { skipped.push({ row: r, reason: `Unknown country "${countryRaw}"` }); continue; }
    if (email && !EMAIL.test(email)) { skipped.push({ row: r, reason: `Invalid email "${email}"` }); continue; }

    if (phonesInFile.has(phone)) { skipped.push({ row: r, reason: `Duplicate phone in file (${phone})` }); continue; }
    phonesInFile.add(phone);

    // a port typed in another case becomes the CRM's own spelling
    const port = resolved.data.ports.find((p) => p.toLowerCase() === portRaw.toLowerCase()) ?? portRaw;

    rows.push({ row: r, contactPerson, customerName, phone, email, country: resolved.name, countryCode: resolved.data.code, port, address });
  }

  // Phones already in the CRM (compared digit for digit, whatever their format) are skipped.
  let toCreate = rows;
  if (rows.length > 0) {
    const existing = await query<{ id: string; digits: string; owner: string | null }>(
      `SELECT l.id, regexp_replace(l.phone, '\\D', '', 'g') AS digits, u.name AS owner
       FROM leads l LEFT JOIN users u ON u.id = l.created_by
       WHERE regexp_replace(l.phone, '\\D', '', 'g') = ANY($1)`,
      [rows.map((l) => l.phone.slice(1))]
    );
    const byDigits = new Map(existing.map((e) => [e.digits, e]));
    const taken = rows.filter((l) => byDigits.has(l.phone.slice(1)));
    for (const l of taken) {
      skipped.push({ row: l.row, reason: `Phone ${l.phone} is already in the CRM (${byDigits.get(l.phone.slice(1))?.owner || "another agent"})` });
    }
    toCreate = rows.filter((l) => !byDigits.has(l.phone.slice(1)));

    // An agent trying to add a client someone already has: flagged and the
    // Supervisors told, as when one lead is added by hand (one note per upload).
    if (taken.length > 0 && session.user.role === "user") {
      const ids = taken.map((l) => byDigits.get(l.phone.slice(1))!.id);
      await query(`UPDATE leads SET duplicate_attempt_by = $1 WHERE id = ANY($2)`, [session.user.id, ids]);
      const supervisors = await query<{ id: string }>(`SELECT id FROM users WHERE role = 'super_admin'`);
      const phones = taken.map((l) => l.phone);
      const list = phones.slice(0, 10).join(", ") + (phones.length > 10 ? ` and ${phones.length - 10} more` : "");
      for (const s of supervisors) {
        await query(
          `INSERT INTO notifications (id, user_id, message, type, lead_id) VALUES ($1, $2, $3, 'duplicate_lead', $4)`,
          [genId(), s.id, `Duplicate leads in an Excel upload by ${session.user.name} — ${taken.length} client(s) already registered (Phone: ${list})`, ids[0]]
        );
      }
    }
  }

  // All of them in one statement, owned by whoever uploaded, dated with the upload time.
  if (toCreate.length > 0) {
    const records = toCreate.map((l) => ({
      id: genId(), contact_person: l.contactPerson, customer_name: l.customerName, phone: l.phone,
      email: l.email, country: l.country, country_code: l.countryCode, port: l.port, address: l.address,
    }));
    await query(
      `INSERT INTO leads (id, contact_person, customer_name, phone, email, country, country_code, port, address, status, is_customer, created_by, created_at, updated_at)
       SELECT r.id, r.contact_person, r.customer_name, r.phone, NULLIF(r.email, ''), r.country, r.country_code, r.port, NULLIF(r.address, ''),
              'new', false, $2, $3, $3
       FROM json_to_recordset($1::json) AS r(id text, contact_person text, customer_name text, phone text, email text,
                                             country text, country_code text, port text, address text)`,
      [JSON.stringify(records), session.user.id, uploadedAt.toISOString()]
    );
  }

  skipped.sort((a, b) => a.row - b.row);
  return NextResponse.json({ imported: toCreate.length, skipped, uploadedAt: uploadedAt.toISOString() });
}
