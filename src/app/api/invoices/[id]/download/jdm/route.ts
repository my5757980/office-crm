import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";
import ExcelJS from "exceljs";

const CAN_DOWNLOAD = ["super_admin"];

const JDM = {
  name: "JDM TRADING CO. LTD",
  addr: "1-203, TAKBATA, NAKAGAWA-KU, NAGOYA-SHI, AICHI 454-0911, JAPAN",
  bankName: "MITSUBISHI UFJ",
  bankBranch: "1-203, TAKBATA, NAKAGAWA-KU, NAGOYA-SHI, AICHI 454-0911, JAPAN",
  accountNo: "0282462",
  swift: "BOTKJPJT",
  accountName: "JDM TRADING CO. LTD",
};

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function styleHeader(ws: ExcelJS.Worksheet, row: number, col: number, value: string, fill = "1a1a2e") {
  const c = ws.getCell(row, col);
  c.value = value;
  c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${fill}` } };
  c.alignment = { horizontal: "center", vertical: "middle" };
  c.border = {
    top: { style: "thin" }, bottom: { style: "thin" },
    left: { style: "thin" }, right: { style: "thin" },
  };
}

function styleCell(ws: ExcelJS.Worksheet, row: number, col: number, value: string | number, bold = false) {
  const c = ws.getCell(row, col);
  c.value = value;
  c.font = { bold, size: 9 };
  c.alignment = { horizontal: typeof value === "number" ? "right" : "left", vertical: "middle" };
  c.border = {
    top: { style: "thin" }, bottom: { style: "thin" },
    left: { style: "thin" }, right: { style: "thin" },
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !CAN_DOWNLOAD.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const { id } = await params;

  const inv = await Invoice.findById(id)
    .populate("leadId", "customerName")
    .lean();
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const date = new Date(inv.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const invNo = `JDM-${String(id).slice(-5).toUpperCase()}`;
  const half = inv.cnfPrice / 2;

  const wb = new ExcelJS.Workbook();
  wb.creator = "SBK CRM";
  const ws = wb.addWorksheet("INVOICE");

  // Column widths
  ws.columns = [
    { width: 5 },   // A - S.No
    { width: 18 },  // B - Make
    { width: 18 },  // C - Model
    { width: 20 },  // D - Chassis
    { width: 8 },   // E - Year
    { width: 12 },  // F - Color
    { width: 12 },  // G - Engine
    { width: 5 },   // H - Qty
    { width: 12 },  // I - CNF$
    { width: 12 },  // J - Total
  ];

  // ── Row 1: Company Name ────────────────────────────
  ws.mergeCells("A1:J1");
  const r1 = ws.getCell("A1");
  r1.value = JDM.name;
  r1.font = { bold: true, size: 14, color: { argb: "FF8B0000" } };
  r1.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 25;

  // ── Row 2: Address (left) + Banking label (right) ─────
  ws.mergeCells("A2:E2");
  ws.getCell("A2").value = JDM.addr;
  ws.getCell("A2").font = { size: 8 };
  ws.getCell("A2").alignment = { horizontal: "left" };

  ws.mergeCells("F2:J2");
  ws.getCell("F2").value = "BANKING DETAILS:";
  ws.getCell("F2").font = { bold: true, size: 9 };
  ws.getCell("F2").alignment = { horizontal: "left" };
  ws.getRow(2).height = 18;

  // ── Row 3: blank (left) + Account Name ─────────────
  ws.mergeCells("F3:J3");
  ws.getCell("F3").value = `ACCOUNT NAME: ${JDM.accountName}`;
  ws.getCell("F3").font = { size: 9 };
  ws.getRow(3).height = 15;

  // ── Row 4: CONSIGNEE label + Bank Name ──────────────
  ws.mergeCells("A4:B4");
  ws.getCell("A4").value = "CONSIGNEE:";
  ws.getCell("A4").font = { bold: true, size: 9 };

  ws.mergeCells("F4:J4");
  ws.getCell("F4").value = `BANK NAME: ${JDM.bankName}`;
  ws.getCell("F4").font = { size: 9 };
  ws.getRow(4).height = 15;

  // ── Row 5: Consignee Name + Branch ─────────────────
  ws.getCell("A5").value = "NAME :";
  ws.getCell("A5").font = { size: 9 };
  ws.mergeCells("B5:E5");
  ws.getCell("B5").value = inv.consignee.name;
  ws.getCell("B5").font = { bold: true, size: 9 };

  ws.mergeCells("F5:J5");
  ws.getCell("F5").value = `BRANCH ADDRESS: ${JDM.bankBranch}`;
  ws.getCell("F5").font = { size: 8 };
  ws.getRow(5).height = 15;

  // ── Row 6: Address + Account No ────────────────────
  ws.getCell("A6").value = "ADDRESS:";
  ws.getCell("A6").font = { size: 9 };
  ws.mergeCells("B6:E6");
  ws.getCell("B6").value = inv.consignee.address;
  ws.getCell("B6").font = { size: 9 };

  ws.mergeCells("F6:J6");
  ws.getCell("F6").value = `ACCOUNT #: ${JDM.accountNo}`;
  ws.getCell("F6").font = { size: 9 };
  ws.getRow(6).height = 15;

  // ── Row 7: Phone + SWIFT ────────────────────────────
  ws.getCell("A7").value = "PHONE:";
  ws.getCell("A7").font = { size: 9 };
  ws.mergeCells("B7:E7");
  ws.getCell("B7").value = inv.consignee.phone;
  ws.getCell("B7").font = { size: 9 };

  ws.mergeCells("F7:J7");
  ws.getCell("F7").value = `SWIFT CODE: ${JDM.swift}`;
  ws.getCell("F7").font = { size: 9 };
  ws.getRow(7).height = 15;

  // ── Row 8: Country + Invoice No ────────────────────
  ws.getCell("A8").value = "COUNTRY:";
  ws.getCell("A8").font = { size: 9 };
  ws.mergeCells("B8:E8");
  ws.getCell("B8").value = inv.consignee.country;
  ws.getCell("B8").font = { size: 9 };

  ws.mergeCells("F8:H8");
  ws.getCell("F8").value = "INVOICE #";
  ws.getCell("F8").font = { bold: true, size: 9 };
  ws.mergeCells("I8:J8");
  ws.getCell("I8").value = invNo;
  ws.getCell("I8").font = { bold: true, size: 9 };
  ws.getRow(8).height = 15;

  // ── Row 9: POD + Date ───────────────────────────────
  ws.getCell("A9").value = "PORT OF DISCHARGE:";
  ws.getCell("A9").font = { size: 9 };
  ws.mergeCells("B9:E9");
  ws.getCell("B9").value = inv.consignee.port;
  ws.getCell("B9").font = { size: 9 };

  ws.mergeCells("F9:H9");
  ws.getCell("F9").value = "DATE:";
  ws.getCell("F9").font = { bold: true, size: 9 };
  ws.mergeCells("I9:J9");
  ws.getCell("I9").value = date;
  ws.getCell("I9").font = { size: 9 };
  ws.getRow(9).height = 15;

  // ── Row 10: blank spacer ────────────────────────────
  ws.getRow(10).height = 8;

  // ── Row 11: Vehicle table header ───────────────────
  const hdrRow = 11;
  const hdrCols = ["No.", "MAKE", "MODEL", "CHASSIS NO.", "YEAR", "COLOR", "ENGINE SIZE", "QTY", "CNF $", "TOTAL $"];
  hdrCols.forEach((h, i) => styleHeader(ws, hdrRow, i + 1, h));
  ws.getRow(hdrRow).height = 18;

  // ── Row 12: Vehicle data ────────────────────────────
  const dataRow = 12;
  const unit = inv.unit.split(" ");
  const make = unit[0] ?? inv.unit;
  const model = unit.slice(1).join(" ") || inv.unit;

  styleCell(ws, dataRow, 1, "1", true);
  styleCell(ws, dataRow, 2, make);
  styleCell(ws, dataRow, 3, model);
  styleCell(ws, dataRow, 4, inv.chassisNo);
  styleCell(ws, dataRow, 5, inv.year ?? "");
  styleCell(ws, dataRow, 6, inv.color);
  styleCell(ws, dataRow, 7, inv.engineNo);
  styleCell(ws, dataRow, 8, 1);
  styleCell(ws, dataRow, 9, fmt(inv.cnfPrice));
  styleCell(ws, dataRow, 10, fmt(inv.cnfPrice));
  ws.getRow(dataRow).height = 18;

  // ── Row 13: blank ───────────────────────────────────
  ws.getRow(13).height = 8;

  // ── Rows 14-16: Totals ──────────────────────────────
  const totalRows: [string, string][] = [
    ["50% ADVANCE PAYMENT", fmt(half)],
    ["BALANCE", fmt(half)],
    ["TOTAL SALES PRICE", fmt(inv.cnfPrice)],
  ];
  totalRows.forEach(([label, val], i) => {
    const r = 14 + i;
    ws.mergeCells(r, 1, r, 8);
    const lc = ws.getCell(r, 1);
    lc.value = label;
    lc.font = { bold: true, size: 9 };
    lc.alignment = { horizontal: "right" };
    ws.mergeCells(r, 9, r, 10);
    const vc = ws.getCell(r, 9);
    vc.value = val;
    vc.font = { bold: true, size: 9 };
    vc.alignment = { horizontal: "right" };
    ws.getRow(r).height = 16;
  });

  // ── Row 17: Notes ───────────────────────────────────
  ws.mergeCells("A17:J17");
  ws.getCell("A17").value = "Special Notes: Please pay all bank charges. Read terms and conditions below.";
  ws.getCell("A17").font = { italic: true, size: 8 };
  ws.getRow(17).height = 14;

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="JDM-Invoice-${invNo}.xlsx"`,
    },
  });
}
