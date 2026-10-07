import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import ExcelJS from "exceljs";
import { LEAD_TEMPLATE_HEADERS } from "@/lib/lead-template";

export const runtime = "nodejs";

const CAN_IMPORT = ["super_admin", "user"];

// Columns and widths, in the order of LEAD_TEMPLATE_HEADERS (the importer needs every heading).
const WIDTHS = [22, 24, 18, 26, 18, 18, 30];

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_IMPORT.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Office CRM";
  const ws = wb.addWorksheet("Leads", { views: [{ state: "frozen", ySplit: 1 }] });

  ws.columns = LEAD_TEMPLATE_HEADERS.map((header, i) => ({ header, width: WIDTHS[i] }));

  // Header styling
  const header = ws.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC0272D" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // Example row (clearly marked — it is skipped on upload; replace it)
  ws.addRow(["Ali Khan (EXAMPLE — replace me)", "Ali Trading Co.", "+256700000000", "ali@example.com", "Uganda", "Mombasa", "Kampala, Uganda"]);
  ws.getRow(2).font = { italic: true, color: { argb: "FF8C959F" } };
  // Phones stay text, so Excel never turns them into 2.567E+11
  ws.getColumn(3).numFmt = "@";

  // The rules, on their own sheet so they are never read as a lead
  const help = wb.addWorksheet("How to fill");
  help.getColumn(1).width = 110;
  [
    "Fill one lead per row on the \"Leads\" sheet. Keep row 1 (the headings) exactly as it is — a file without all 7 headings is refused.",
    "Needed in every row: Contact Person OR Customer Name, Phone, Country. Rows without them are skipped and listed after the upload.",
    "Optional: Email, Port, Address (and the other name). A cell left blank stays blank.",
    "Country must be written as in the CRM's country list (e.g. Uganda, Kenya, Japan). Its country code is filled in automatically.",
    "A phone that is already in the CRM is skipped. The same phone twice in the file: only the first is added.",
    "Set automatically: the Date (the upload time, the same for every lead in the file) and the Sales person / owner (whoever uploads the file).",
    `At most 2000 leads per file.`,
  ].forEach((line) => help.addRow([line]));
  help.getRow(1).font = { bold: true };

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
