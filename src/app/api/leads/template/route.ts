import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

const CAN_IMPORT = ["super_admin"];

// Column order the importer expects — keep in sync with /api/leads/import
export const TEMPLATE_HEADERS = [
  "Contact Person",
  "Customer Name",
  "Phone",
  "Email",
  "Country",
  "Port",
  "Address",
];

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_IMPORT.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Office CRM";
  const ws = wb.addWorksheet("Leads");

  ws.columns = [
    { header: "Contact Person", key: "contactPerson", width: 22 },
    { header: "Customer Name",  key: "customerName",  width: 22 },
    { header: "Phone",          key: "phone",         width: 18 },
    { header: "Email",          key: "email",         width: 26 },
    { header: "Country",        key: "country",       width: 18 },
    { header: "Port",           key: "port",          width: 18 },
    { header: "Address",        key: "address",       width: 30 },
  ];

  // Header styling
  const header = ws.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC0272D" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // Example row (clearly marked — supervisor should delete/replace it)
  ws.addRow({
    contactPerson: "Ali Khan (EXAMPLE — replace me)",
    customerName:  "Ali Trading Co.",
    phone:         "+256700000000",
    email:         "ali@example.com",
    country:       "Uganda",
    port:          "Mombasa",
    address:       "Kampala, Uganda",
  });
  ws.getRow(2).font = { italic: true, color: { argb: "FF8C959F" } };

  // Required-fields note
  ws.addRow([]);
  const note = ws.addRow(["Required: Contact Person, Phone, Country, Port. Country & Port must match CRM list. Country Code is auto-filled."]);
  note.getCell(1).font = { italic: true, size: 9, color: { argb: "FF656D76" } };

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="CRM-Leads-Template.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
