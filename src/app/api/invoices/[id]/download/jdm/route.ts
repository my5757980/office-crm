import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";
import ExcelJS from "exceljs";

const CAN_DOWNLOAD = ["super_admin"];

const JDM = {
  name: "JDM TRADING CO. LTD",
  bankBranch1: "1-203, TAKBATA, NAKAGAWA-KU,",
  bankBranch2: "NAGOYA-SHI, AICHI 454-0911, JAPAN",
  bankName: "MITSUBISHI UFJ",
  accountNo: "0282462",
  swift: "BOTKJPJT",
  accountName: "JDM TRADING CO. LTD",
};

const THIN = { style: "thin" as const };

function border(cell: ExcelJS.Cell) {
  cell.border = { top: THIN, bottom: THIN, left: THIN, right: THIN };
}

function hdr(ws: ExcelJS.Worksheet, r: number, c: number, val: string) {
  const cell = ws.getCell(r, c);
  cell.value = val;
  cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1a1a2e" } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  border(cell);
}

function dat(ws: ExcelJS.Worksheet, r: number, c: number, val: string | number, opts: { bold?: boolean; align?: "left"|"center"|"right"; numFmt?: string } = {}) {
  const cell = ws.getCell(r, c);
  cell.value = val;
  cell.font = { bold: opts.bold, size: 9 };
  cell.alignment = { horizontal: opts.align ?? (typeof val === "number" ? "right" : "left"), vertical: "middle", wrapText: true };
  if (opts.numFmt) cell.numFmt = opts.numFmt;
  border(cell);
}

function lbl(ws: ExcelJS.Worksheet, r: number, c: number, val: string, size = 9) {
  const cell = ws.getCell(r, c);
  cell.value = val;
  cell.font = { size };
  cell.alignment = { vertical: "middle" };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !CAN_DOWNLOAD.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const { id } = await params;

  const inv = await Invoice.findById(id).populate("leadId", "customerName").lean();
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const date = new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const invNo = `JDM-${String(id).slice(-5).toUpperCase()}`;
  const half = inv.cnfPrice / 2;

  const unitParts = inv.unit.split(" ");
  const make  = unitParts[0] ?? inv.unit;
  const model = unitParts.slice(1).join(" ") || inv.unit;

  const wb = new ExcelJS.Workbook();
  wb.creator = "SBK CRM";
  const ws = wb.addWorksheet("INVOICE");

  // 24 column widths matching original
  ws.columns = [
    { width: 2.2 },  { width: 12.4 }, { width: 5.1 },  { width: 12.4 },
    { width: 14.1 }, { width: 0.9 },  { width: 6.4 },  { width: 6.4 },
    { width: 7.1 },  { width: 5.5 },  { width: 6.9 },  { width: 8.1 },
    { width: 6.6 },  { width: 9.6 },  { width: 9.5 },  { width: 5.4 },
    { width: 12.1 }, { width: 16.1 }, { width: 20.8 }, { width: 9.0 },
    { width: 9.0 },  { width: 9.0 },  { width: 9.0 },  { width: 9.0 },
  ];

  // ── R1-R2: blank ─────────────────────────────────────
  ws.getRow(1).height = 10;
  ws.getRow(2).height = 10;

  // ── R3: Company name (A3:S3 merged) ─────────────────
  ws.mergeCells(3, 1, 3, 19);
  const r3 = ws.getCell(3, 1);
  r3.value = JDM.name;
  r3.font = { bold: true, size: 14, color: { argb: "FF8B0000" } };
  r3.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(3).height = 25;

  // ── R4: ADDRESS label (left) + BANKING DETAILS (right) ─
  ws.mergeCells(4, 2, 4, 7);
  lbl(ws, 4, 2, "          ADDRESS:", 8);
  ws.mergeCells(4, 17, 4, 18);
  const r4bank = ws.getCell(4, 17);
  r4bank.value = "                      BANKING DETAILS:";
  r4bank.font = { bold: true, size: 9 };
  ws.getRow(4).height = 15;

  // ── R5-R10: Banking details (col U=21) ──────────────
  const bankLines = [
    `ACCOUNT NAME: ${JDM.accountName}`,
    `BANK NAME: ${JDM.bankName}`,
    `BRANCH ADDRESS: ${JDM.bankBranch1}`,
    JDM.bankBranch2,
    `ACCOUNT # ${JDM.accountNo}`,
    `SWIFT CODE: ${JDM.swift}`,
  ];
  bankLines.forEach((val, i) => {
    const r = 5 + i;
    ws.mergeCells(r, 21, r, 24);
    lbl(ws, r, 21, val, 9);
    ws.getRow(r).height = 15;
  });

  // R7 also has C1:C14 merged (separator line)
  ws.mergeCells(7, 1, 7, 14);

  // ── R10: CONSIGNEE + NOTIFY PARTY labels ─────────────
  lbl(ws, 10, 2, "CONSIGNEE:", 9);
  ws.getCell(10, 2).font = { bold: true, size: 9 };
  lbl(ws, 10, 8, "NOTIFY PARTY:", 9);
  ws.getCell(10, 8).font = { bold: true, size: 9 };
  ws.getRow(10).height = 18;

  // ── R11: spacer ──────────────────────────────────────
  ws.getRow(11).height = 8;

  // ── R12: NAME row ────────────────────────────────────
  lbl(ws, 12, 2, "NAME :", 9);
  ws.mergeCells(12, 3, 12, 5);
  const r12name = ws.getCell(12, 3);
  r12name.value = inv.consignee.name;
  r12name.font = { bold: true, size: 9 };
  // Notify party
  ws.mergeCells(12, 8, 12, 9);
  lbl(ws, 12, 8, "NAME:", 9);
  ws.mergeCells(12, 10, 12, 14);
  lbl(ws, 12, 10, "SAME", 9);
  // Date on right
  ws.mergeCells(12, 19, 12, 24);
  const r12date = ws.getCell(12, 19);
  r12date.value = `DATE:${date}`;
  r12date.font = { bold: true, size: 9 };
  ws.getRow(12).height = 15;

  // ── R13: ADDRESS row ──────────────────────────────────
  lbl(ws, 13, 2, "ADDRESS:", 9);
  ws.mergeCells(13, 3, 13, 5);
  lbl(ws, 13, 3, inv.consignee.address, 9);
  ws.mergeCells(13, 8, 13, 9);
  lbl(ws, 13, 8, "Address :", 9);
  ws.mergeCells(13, 10, 13, 14);
  lbl(ws, 13, 10, "SAME", 9);
  ws.mergeCells(13, 19, 13, 24);
  const r13inv = ws.getCell(13, 19);
  r13inv.value = `INVOICE # ${invNo}`;
  r13inv.font = { bold: true, size: 9 };
  ws.getRow(13).height = 15;

  // ── R14: address line 2 ───────────────────────────────
  ws.mergeCells(14, 3, 14, 5);
  ws.mergeCells(14, 8, 14, 9);
  ws.mergeCells(14, 10, 14, 14);
  ws.getRow(14).height = 15;

  // ── R15: PHONE ────────────────────────────────────────
  lbl(ws, 15, 2, "PHONE:", 9);
  ws.mergeCells(15, 3, 15, 5);
  lbl(ws, 15, 3, inv.consignee.phone, 9);
  ws.mergeCells(15, 8, 15, 9);
  ws.mergeCells(15, 10, 15, 14);
  ws.getRow(15).height = 15;

  // ── R16: POD ─────────────────────────────────────────
  lbl(ws, 16, 2, "POD:", 9);
  ws.mergeCells(16, 3, 16, 5);
  lbl(ws, 16, 3, inv.consignee.port, 9);
  ws.mergeCells(16, 8, 16, 9);
  ws.mergeCells(16, 10, 16, 14);
  ws.getRow(16).height = 15;

  // ── R17: COUNTRY ─────────────────────────────────────
  lbl(ws, 17, 2, "COUNTRY :", 9);
  ws.mergeCells(17, 3, 17, 5);
  lbl(ws, 17, 3, inv.consignee.country, 9);
  ws.getRow(17).height = 15;

  // ── R18: spacer ──────────────────────────────────────
  ws.mergeCells(18, 2, 18, 5);
  ws.mergeCells(18, 8, 18, 13);
  ws.getRow(18).height = 8;

  // ── R19: Vehicle table header ─────────────────────────
  ws.mergeCells(19, 3, 19, 4);
  ws.mergeCells(19, 5, 19, 6);
  ws.mergeCells(19, 7, 19, 9);
  ws.mergeCells(19, 10, 19, 12);
  ws.mergeCells(19, 13, 19, 14);
  ws.mergeCells(19, 15, 19, 16);
  hdr(ws, 19, 2,  "No.");
  hdr(ws, 19, 3,  "MAKE");
  hdr(ws, 19, 5,  "MODEL");
  hdr(ws, 19, 7,  "CHASSIS");
  hdr(ws, 19, 10, "YEAR");
  hdr(ws, 19, 13, "COLOR");
  hdr(ws, 19, 15, "ENGINE SIZE");
  hdr(ws, 19, 17, "QTY");
  hdr(ws, 19, 18, "CNF$");
  hdr(ws, 19, 19, "TOTAL AMOUNT $");
  ws.getRow(19).height = 18;

  // Helper: apply data row merge+border structure
  function applyDataRowFormat(r: number) {
    ws.mergeCells(r, 3, r, 4);
    ws.mergeCells(r, 5, r, 6);
    ws.mergeCells(r, 7, r, 9);
    ws.mergeCells(r, 10, r, 12);
    ws.mergeCells(r, 13, r, 14);
    ws.mergeCells(r, 15, r, 16);
    [2, 3, 5, 7, 10, 13, 15, 17, 18, 19].forEach(c => border(ws.getCell(r, c)));
    ws.getRow(r).height = 18;
  }

  // ── R20: blank formatted row ─────────────────────────
  applyDataRowFormat(20);

  // ── R21: vehicle data ─────────────────────────────────
  applyDataRowFormat(21);
  dat(ws, 21, 2,  "1",           { bold: true, align: "center" });
  dat(ws, 21, 3,  make);
  dat(ws, 21, 5,  model);
  dat(ws, 21, 7,  inv.chassisNo);
  dat(ws, 21, 10, inv.year ?? "");
  dat(ws, 21, 13, inv.color);
  dat(ws, 21, 15, inv.engineNo);
  dat(ws, 21, 17, 1,             { align: "center" });
  dat(ws, 21, 18, inv.cnfPrice,  { numFmt: "#,##0" });
  dat(ws, 21, 19, inv.cnfPrice,  { numFmt: "#,##0" });

  // ── R22-R30: empty formatted rows ────────────────────
  for (let r = 22; r <= 30; r++) applyDataRowFormat(r);

  // ── R31: separator row ────────────────────────────────
  applyDataRowFormat(31);

  // ── R32-R34: totals ───────────────────────────────────
  function totalRow(r: number, label: string, val: number) {
    ws.mergeCells(r, 3, r, 4);
    ws.mergeCells(r, 5, r, 6);
    ws.mergeCells(r, 7, r, 9);
    ws.mergeCells(r, 10, r, 12);
    ws.mergeCells(r, 13, r, 14);
    ws.mergeCells(r, 15, r, 17);
    const lc = ws.getCell(r, 15);
    lc.value = label;
    lc.font = { bold: true, size: 9 };
    lc.alignment = { horizontal: "right", vertical: "middle" };
    border(lc);
    const uc = ws.getCell(r, 18);
    uc.value = "US$";
    uc.font = { bold: true, size: 9 };
    uc.alignment = { horizontal: "center", vertical: "middle" };
    border(uc);
    const vc = ws.getCell(r, 19);
    vc.value = val;
    vc.font = { bold: true, size: 9 };
    vc.alignment = { horizontal: "right", vertical: "middle" };
    vc.numFmt = "#,##0";
    border(vc);
    [3, 5, 7, 10, 13].forEach(c => border(ws.getCell(r, c)));
    ws.getRow(r).height = 16;
  }

  totalRow(32, "50% ADVANCE PAYMENT", half);
  totalRow(33, "BALANCE",             half);

  // R34: Special Notes + TOTAL SALES PRICE
  ws.mergeCells(34, 2, 34, 14);
  const r34note = ws.getCell(34, 2);
  r34note.value = "Special Notes and Instructions";
  r34note.font = { bold: true, size: 9 };
  border(r34note);
  ws.mergeCells(34, 15, 34, 17);
  const r34lbl = ws.getCell(34, 15);
  r34lbl.value = "TOTAL SALES PRICE";
  r34lbl.font = { bold: true, size: 9 };
  r34lbl.alignment = { horizontal: "right", vertical: "middle" };
  border(r34lbl);
  const r34us = ws.getCell(34, 18);
  r34us.value = "US$";
  r34us.font = { bold: true, size: 9 };
  r34us.alignment = { horizontal: "center", vertical: "middle" };
  border(r34us);
  const r34val = ws.getCell(34, 19);
  r34val.value = inv.cnfPrice;
  r34val.font = { bold: true, size: 9 };
  r34val.alignment = { horizontal: "right", vertical: "middle" };
  r34val.numFmt = "#,##0";
  border(r34val);
  ws.getRow(34).height = 16;

  // ── R35-R42: Notes ────────────────────────────────────
  const notes: [number, string, boolean][] = [
    [35, "Shipping:", true],
    [36, "=>  After receiving deposit/payment original Bill of Lading will be released once full payment is received.", false],
    [37, "Conditions:", true],
    [38, "=>  Please confirm import regulations with your local authority before purchase.", false],
    [39, "=>  Price stated in the invoice does not cover any bank charges.", false],
    [40, "=>  Or additional charges payable to the bank.", false],
    [41, "=>  All bank charges must be paid by the customer.", false],
    [42, "=>  This is a computer generated invoice and requires no signature.", false],
  ];
  notes.forEach(([r, text, bold]) => {
    ws.mergeCells(r, 2, r, 19);
    const c = ws.getCell(r, 2);
    c.value = text;
    c.font = { bold, size: 8 };
    c.alignment = { vertical: "middle" };
    ws.getRow(r).height = 14;
  });

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="JDM-Invoice-${invNo}.xlsx"`,
    },
  });
}
