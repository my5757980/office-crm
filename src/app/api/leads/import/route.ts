import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Lead from "@/models/Lead";
import ExcelJS from "exceljs";
import countriesPorts from "@/data/countries_ports.json";

export const runtime = "nodejs";

const CAN_IMPORT = ["super_admin"];

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
  return String(v).trim();
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_IMPORT.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden — only Supervisor can import leads" }, { status: 403 });

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
    return NextResponse.json({ error: "Could not read the Excel file. Use the provided template." }, { status: 400 });
  }

  const ws = wb.worksheets[0];
  if (!ws) return NextResponse.json({ error: "Excel file has no sheet" }, { status: 400 });

  await dbConnect();

  // Column index by header name (row 1)
  const headerRow = ws.getRow(1);
  const colIndex: Record<string, number> = {};
  headerRow.eachCell((cell, col) => {
    colIndex[cellStr(cell.value).toLowerCase()] = col;
  });
  const col = (name: string) => colIndex[name.toLowerCase()];
  const ci = {
    contactPerson: col("Contact Person"),
    customerName:  col("Customer Name"),
    phone:         col("Phone"),
    email:         col("Email"),
    country:       col("Country"),
    port:          col("Port"),
    address:       col("Address"),
  };
  if (!ci.contactPerson || !ci.phone || !ci.country || !ci.port) {
    return NextResponse.json({ error: "Template columns missing. Download a fresh template." }, { status: 400 });
  }

  const skipped: { row: number; reason: string }[] = [];
  const toCreate: Record<string, unknown>[] = [];
  const phonesInFile = new Set<string>();

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const contactPerson = cellStr(row.getCell(ci.contactPerson!).value);
    const phone         = cellStr(row.getCell(ci.phone!).value);
    const countryRaw    = cellStr(row.getCell(ci.country!).value);
    const port          = cellStr(row.getCell(ci.port!).value);
    const customerName  = ci.customerName ? cellStr(row.getCell(ci.customerName).value) : "";
    const email         = ci.email ? cellStr(row.getCell(ci.email).value) : "";
    const address       = ci.address ? cellStr(row.getCell(ci.address).value) : "";

    // skip fully-empty rows + the example row
    if (!contactPerson && !phone && !countryRaw && !port) continue;
    if (/example/i.test(contactPerson)) continue;

    if (!contactPerson) { skipped.push({ row: r, reason: "Missing Contact Person" }); continue; }
    if (!phone)         { skipped.push({ row: r, reason: "Missing Phone" }); continue; }
    if (!countryRaw)    { skipped.push({ row: r, reason: "Missing Country" }); continue; }
    if (!port)          { skipped.push({ row: r, reason: "Missing Port" }); continue; }

    const resolved = resolveCountry(countryRaw);
    if (!resolved) { skipped.push({ row: r, reason: `Unknown country "${countryRaw}"` }); continue; }

    if (phonesInFile.has(phone)) { skipped.push({ row: r, reason: `Duplicate phone in file (${phone})` }); continue; }
    phonesInFile.add(phone);

    toCreate.push({
      contactPerson, customerName, phone, email,
      country: resolved.name, countryCode: resolved.data.code, port, address,
      status: "new", isCustomer: false,
      createdBy: session.user.id, // imported under the Supervisor
    });
  }

  // Skip phones that already exist in the CRM
  if (toCreate.length > 0) {
    const phones = toCreate.map(l => l.phone as string);
    const existing = await Lead.find({ phone: { $in: phones } }).select("phone").lean();
    const existingSet = new Set(existing.map(e => e.phone));
    for (let i = toCreate.length - 1; i >= 0; i--) {
      if (existingSet.has(toCreate[i].phone as string)) {
        skipped.push({ row: -1, reason: `Phone already in CRM (${toCreate[i].phone})` });
        toCreate.splice(i, 1);
      }
    }
  }

  let imported = 0;
  if (toCreate.length > 0) {
    const created = await Lead.insertMany(toCreate, { ordered: false });
    imported = created.length;
  }

  return NextResponse.json({ imported, skipped });
}
