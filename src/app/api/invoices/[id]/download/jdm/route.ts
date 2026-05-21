import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

const CAN_DOWNLOAD = ["super_admin"];

const JDM = {
  name:        "JDM TRADING CO. LTD",
  addr1:       "NAGOYASHI MIDORI-KU-SHIKAYAMA",
  addr2:       "2-1-1- ROYAL SHIKAYAMA A503, JAPAN",
  tel:         "TEL: +81-52-755-0916 FAX: +81-52-717-7427",
  email:       "info@jdm-trading.com",
  bankName:    "MITSUBISHI UFJ",
  bankBranch1: "1-203, TAKBATA, NAKAGAWA-KU,",
  bankBranch2: "NAGOYA-SHI, AICHI 454-0911, JAPAN",
  accountNo:   "0282462",
  swift:       "BOTKJPJT",
  accountName: "JDM TRADING CO. LTD",
  intBankName: "BANK NAME: BANK OF TOKYO MITSUBISHI UFJ, LTD.,",
  intBranch:   "BRANCH NAME: NEW YORK BRANCH",
  intAddr:     "ADDRESS: 1251 AVENUE OF THE AMERICAS",
  intCity:     "CITY: NEW YORK, NY",
  intPost:     "POST CODE: 10020-1104",
  intSwift:    "SWIFT CODE: BOTKUS33",
};

const THIN = { style: "thin" as const };

function bdr(cell: ExcelJS.Cell) {
  cell.border = { top: THIN, bottom: THIN, left: THIN, right: THIN };
}

function set(
  ws: ExcelJS.Worksheet, r: number, c: number,
  val: string | number,
  opts: {
    bold?: boolean; size?: number; color?: string;
    h?: "left"|"center"|"right"; v?: "middle"|"top"|"bottom";
    wrap?: boolean; numFmt?: string; fill?: string; underline?: boolean;
  } = {}
) {
  const cell = ws.getCell(r, c);
  cell.value = val;
  cell.font = {
    bold: opts.bold ?? false,
    size: opts.size ?? 10,
    color: opts.color ? { argb: opts.color } : undefined,
    underline: opts.underline ? "single" : undefined,
  };
  cell.alignment = {
    horizontal: opts.h ?? "left",
    vertical: opts.v ?? "middle",
    wrapText: opts.wrap ?? false,
  };
  if (opts.numFmt) cell.numFmt = opts.numFmt;
  if (opts.fill) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fill } };
  }
}

function hdrCell(ws: ExcelJS.Worksheet, r: number, c: number, val: string) {
  set(ws, r, c, val, { bold: true, color: "FFFFFFFF", h: "center", fill: "FF1A1A2E" });
  bdr(ws.getCell(r, c));
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !CAN_DOWNLOAD.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const { id } = await params;

  const inv = await Invoice.findById(id).lean();
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const date        = new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const invNo       = `JDM-${String(id).slice(-5).toUpperCase()}`;
  const advPct      = inv.advancePercent ?? 50;
  const advanceAmt  = Math.round(inv.cnfPrice * advPct / 100);
  const remaining   = inv.cnfPrice - advanceAmt;

  const unitParts = inv.unit.split(" ");
  const make  = unitParts[0] ?? inv.unit;
  const model = unitParts.slice(1).join(" ") || inv.unit;

  const logoPath   = path.join(process.cwd(), "public", "images", "jdm-logo.png");
  const logoBuffer = fs.readFileSync(logoPath);

  const wb = new ExcelJS.Workbook();
  wb.creator = "SBK CRM";
  const ws = wb.addWorksheet("INVOICE");

  // ── 15 columns A–O ──────────────────────────────────────────────────────────
  ws.columns = [
    { width: 8.86 },  // A  (1)  No. / labels / notes
    { width: 9.0  },  // B  (2)  MAKE / consignee data
    { width: 7.0  },  // C  (3)  MAKE merge
    { width: 8.0  },  // D  (4)  MODEL
    { width: 8.0  },  // E  (5)  company info / CHASSIS
    { width: 7.0  },  // F  (6)  NOTIFY PARTY / CHASSIS merge
    { width: 7.86 },  // G  (7)  YEAR
    { width: 7.0  },  // H  (8)  YEAR merge
    { width: 7.14 },  // I  (9)  COLOR
    { width: 6.57 },  // J  (10) COLOR merge
    { width: 8.86 },  // K  (11) ENGINE SIZE / INVOICE / banking
    { width: 11.0 },  // L  (12) ENGINE SIZE merge / intermediary banking
    { width: 7.0  },  // M  (13) QTY / label merge
    { width: 9.0  },  // N  (14) CNF$ / US$
    { width: 17.29 }, // O  (15) TOTAL AMOUNT $
  ];
  // Default font size 10 to match original (blank cells inherit this)
  for (let c = 1; c <= 15; c++) {
    ws.getColumn(c).style = { font: { size: 10, name: "Calibri" } };
  }

  // A4 landscape — fills page when Ctrl+P
  ws.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };

  // ── Logo image (rows 1-2, col A) ────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logoImgId = wb.addImage({ buffer: logoBuffer as any, extension: "png" });
  ws.addImage(logoImgId, { tl: { col: 0, row: 0 }, ext: { width: 200, height: 80 } });
  ws.getRow(1).height = 45;
  ws.getRow(2).height = 45;

  // ── Row 3: Company name (E) + BANKING DETAILS (K) ────────────────────────
  ws.getRow(3).height = 19.5;
  set(ws, 3, 5, JDM.name,         { bold: true, size: 15, color: "FF8B0000" });
  set(ws, 3, 11, "BANKING DETAILS", { bold: true, h: "left", underline: true });

  // ── Rows 4-9: Company address (E) + Banking lines (K) ────────────────────
  set(ws, 4, 5, "ADDRESS",                              { bold: true, underline: true });
  set(ws, 4, 11, `ACCOUNT NAME: ${JDM.accountName}`,    { h: "left" });

  set(ws, 5, 5, JDM.addr1,                              {});
  set(ws, 5, 11, `BANK NAME: ${JDM.bankName}`,          { h: "left" });

  set(ws, 6, 5, JDM.addr2,                              {});
  set(ws, 6, 11, `BRANCH ADDRESS: ${JDM.bankBranch1}`,  { h: "left" });

  set(ws, 7, 5, JDM.tel,                                {});
  set(ws, 7, 11, JDM.bankBranch2,                       { h: "left" });

  set(ws, 8, 5, JDM.email,                              {});
  set(ws, 8, 11, `ACCOUNT # ${JDM.accountNo}`,          { h: "left" });

  set(ws, 9, 11, `SWIFT CODE: ${JDM.swift}`,            { h: "left" });

  // ── Row 10: CONSIGNEE + NOTIFY PARTY labels ──────────────────────────────
  set(ws, 10, 1, "CONSIGNEE",    { bold: true, underline: true });
  set(ws, 10, 6, "NOTIFY PARTY", { bold: true, underline: true });
  ws.getRow(10).height = 18;

  // ── Row 11: spacer ───────────────────────────────────────────────────────
  ws.getRow(11).height = 8;

  // ── Row 12: NAME / SAME AS CONSIGNEE / INVOICE (merged K12:O13) ─────────
  ws.mergeCells(12, 2, 12, 4);
  set(ws, 12, 1, "NAME :",                 {});
  set(ws, 12, 2, inv.consignee.name,       { bold: true });
  set(ws, 12, 6, "SAME AS CONSIGNEE",      {});
  ws.mergeCells(12, 11, 13, 15);
  set(ws, 12, 11, "INVOICE",               { bold: true, size: 18, h: "center" });
  ws.getRow(12).height = 15;

  // ── Row 13: ADDRESS ───────────────────────────────────────────────────────
  ws.mergeCells(13, 2, 13, 4);
  set(ws, 13, 1, "ADDRESS:",               {});
  set(ws, 13, 2, inv.consignee.address,    {});
  ws.getRow(13).height = 15;

  // ── Row 14: (extra address line — empty) ─────────────────────────────────
  ws.mergeCells(14, 2, 14, 4);
  ws.getRow(14).height = 15;

  // ── Row 15: PHONE + DATE ─────────────────────────────────────────────────
  ws.mergeCells(15, 2, 15, 4);
  set(ws, 15, 1, "PHONE:",                 {});
  set(ws, 15, 2, inv.consignee.phone,      {});
  ws.mergeCells(15, 11, 15, 15);
  set(ws, 15, 11, `DATE:${date}`,          { bold: true, h: "center" });
  ws.getRow(15).height = 15;

  // ── Row 16: POD + INVOICE # ───────────────────────────────────────────────
  ws.mergeCells(16, 2, 16, 4);
  set(ws, 16, 1, "POD:",                   {});
  set(ws, 16, 2, inv.consignee.port,       {});
  ws.mergeCells(16, 11, 16, 15);
  set(ws, 16, 11, `INVOICE # ${invNo}`,    { bold: true, h: "center" });
  ws.getRow(16).height = 15;

  // ── Row 17: COUNTRY ───────────────────────────────────────────────────────
  ws.mergeCells(17, 2, 17, 4);
  set(ws, 17, 1, "COUNTRY :",              {});
  set(ws, 17, 2, inv.consignee.country,    {});
  ws.getRow(17).height = 15;

  // ── Row 18: spacer ────────────────────────────────────────────────────────
  ws.mergeCells(18, 1, 18, 4);
  ws.mergeCells(18, 6, 18, 9);
  ws.getRow(18).height = 8;

  // ── Row 19: Table header ─────────────────────────────────────────────────
  ws.mergeCells(19, 2, 19, 3);   // MAKE
  ws.mergeCells(19, 5, 19, 6);   // CHASSIS
  ws.mergeCells(19, 7, 19, 8);   // YEAR
  ws.mergeCells(19, 9, 19, 10);  // COLOR
  ws.mergeCells(19, 11, 19, 12); // ENGINE SIZE
  hdrCell(ws, 19, 1,  "No.");
  hdrCell(ws, 19, 2,  "MAKE");
  hdrCell(ws, 19, 4,  "MODEL");
  hdrCell(ws, 19, 5,  "CHASSIS");
  hdrCell(ws, 19, 7,  "YEAR");
  hdrCell(ws, 19, 9,  "COLOR");
  hdrCell(ws, 19, 11, "ENGINE SIZE");
  hdrCell(ws, 19, 13, "QTY");
  hdrCell(ws, 19, 14, "CNF$");
  hdrCell(ws, 19, 15, "TOTAL AMOUNT $");
  ws.getRow(19).height = 18;

  // ── Data row format ───────────────────────────────────────────────────────
  function dataRowFmt(r: number) {
    ws.mergeCells(r, 2, r, 3);
    ws.mergeCells(r, 5, r, 6);
    ws.mergeCells(r, 7, r, 8);
    ws.mergeCells(r, 9, r, 10);
    ws.mergeCells(r, 11, r, 12);
    [1, 2, 4, 5, 7, 9, 11, 13, 14, 15].forEach(c => bdr(ws.getCell(r, c)));
    ws.getRow(r).height = 18;
  }

  // ── Row 20: empty data row ────────────────────────────────────────────────
  dataRowFmt(20);

  // ── Row 21: Vehicle data ──────────────────────────────────────────────────
  dataRowFmt(21);
  const setDat = (c: number, val: string | number, h?: "left"|"center"|"right") => {
    const cell = ws.getCell(21, c);
    cell.value = val;
    cell.font = { size: 10 };
    cell.alignment = { horizontal: h ?? (typeof val === "number" ? "right" : "left"), vertical: "middle" };
  };
  setDat(1,  "1",             "center");
  setDat(2,  make);
  setDat(4,  model);
  setDat(5,  inv.chassisNo);
  setDat(7,  inv.year ?? "");
  setDat(9,  inv.color);
  setDat(11, inv.engineNo ?? "");
  setDat(13, 1,               "center");
  setDat(14, inv.cnfPrice);
  ws.getCell(21, 14).numFmt = "#,##0";
  setDat(15, inv.cnfPrice);
  ws.getCell(21, 15).numFmt = "#,##0";

  // ── Rows 22-28: empty data rows ───────────────────────────────────────────
  for (let r = 22; r <= 28; r++) dataRowFmt(r);

  // ── Total rows helper ─────────────────────────────────────────────────────
  function totalRow(r: number, label: string, val: number) {
    ws.mergeCells(r, 2, r, 3);
    ws.mergeCells(r, 5, r, 6);
    ws.mergeCells(r, 7, r, 8);
    ws.mergeCells(r, 9, r, 10);
    ws.mergeCells(r, 11, r, 13); // K:M for label
    const lc = ws.getCell(r, 11);
    lc.value = label;
    lc.font  = { bold: true, size: 10 };
    lc.alignment = { horizontal: "right", vertical: "middle" };
    bdr(lc);
    const uc = ws.getCell(r, 14);
    uc.value = "US$";
    uc.font  = { bold: true, size: 10 };
    uc.alignment = { horizontal: "center", vertical: "middle" };
    bdr(uc);
    const vc = ws.getCell(r, 15);
    vc.value = val;
    vc.font  = { bold: true, size: 10 };
    vc.alignment = { horizontal: "right", vertical: "middle" };
    vc.numFmt = "#,##0";
    bdr(vc);
    [1, 2, 4, 5, 7, 9].forEach(c => bdr(ws.getCell(r, c)));
    ws.getRow(r).height = 16;
  }

  // Adds border sides without wiping existing sides on the cell
  function addBdr(r: number, c: number, top: boolean, bot: boolean, lft: boolean, rgt: boolean) {
    const cell = ws.getCell(r, c);
    const cur: ExcelJS.Borders = (cell.border as ExcelJS.Borders) || {};
    cell.border = {
      top:    top ? THIN : cur.top,
      bottom: bot ? THIN : cur.bottom,
      left:   lft ? THIN : cur.left,
      right:  rgt ? THIN : cur.right,
    };
  }

  // ── Row 29: Advance payment ───────────────────────────────────────────────
  totalRow(29, `${advPct}% ADVANCE PAYMENT`, advanceAmt);

  // ── Row 30: Balance ───────────────────────────────────────────────────────
  totalRow(30, "BALANCE", remaining);

  // ── Row 31: Special Notes + TOTAL SALES PRICE ────────────────────────────
  ws.mergeCells(31, 1, 31, 10); // A:J
  const r31note = ws.getCell(31, 1);
  r31note.value = "Special Notes and Instructions";
  r31note.font  = { bold: true, size: 10 };
  bdr(r31note);

  ws.mergeCells(31, 11, 31, 13); // K:M
  const r31lbl = ws.getCell(31, 11);
  r31lbl.value = "TOTAL SALES PRICE";
  r31lbl.font  = { bold: true, size: 10 };
  r31lbl.alignment = { horizontal: "right", vertical: "middle" };
  bdr(r31lbl);

  const r31us = ws.getCell(31, 14);
  r31us.value = "US$";
  r31us.font  = { bold: true, size: 10 };
  r31us.alignment = { horizontal: "center", vertical: "middle" };
  bdr(r31us);

  const r31val = ws.getCell(31, 15);
  r31val.value = inv.cnfPrice;
  r31val.font  = { bold: true, size: 10 };
  r31val.alignment = { horizontal: "right", vertical: "middle" };
  r31val.numFmt = "#,##0";
  bdr(r31val);
  ws.getRow(31).height = 16;

  // ── Rows 32-39: Notes (A) + Intermediary banking (L) ─────────────────────
  const notes: [string, boolean][] = [
    ["Shipping:",                                                                                                   true],
    ["=>  After receiving deposit/payment original Bill of Lading will be released once full payment is received.", false],
    ["Conditions:",                                                                                                 true],
    ["=>  Please confirm import regulations with your local authority before purchase.",                             false],
    ["=>  Price stated in the invoice does not cover any bank charges.",                                            false],
    ["=>  Or additional charges payable to the bank.",                                                              false],
    ["=>  All bank charges must be paid by the customer.",                                                          false],
    ["=>  This is a computer generated invoice and requires no signature.",                                         false],
  ];

  const intBank: [string, boolean][] = [
    ["",                      false],
    ["INTERMEDIARY BANKING DETAILS", true],
    [JDM.intBankName,         false],
    [JDM.intBranch,           false],
    [JDM.intAddr,             false],
    [JDM.intCity,             false],
    [JDM.intPost,             false],
    [JDM.intSwift,            false],
  ];

  notes.forEach(([text, bold], i) => {
    const r = 32 + i;
    const c = ws.getCell(r, 1);
    c.value = text;
    c.font  = { bold, size: 10 };
    c.alignment = { vertical: "middle" };
    ws.getRow(r).height = 14;
  });

  intBank.forEach(([text, bold], i) => {
    const r = 32 + i;
    ws.mergeCells(r, 12, r, 15);
    const c = ws.getCell(r, 12);
    c.value = text;
    c.font  = { bold, size: 10, underline: bold ? "single" : undefined };
    c.alignment = { horizontal: "left", vertical: "middle" };
  });

  // ── Section box borders ──────────────────────────────────────────────────

  // Banking box: K(11)–O(15), rows 3–9
  for (let c = 11; c <= 15; c++) addBdr(3, c,  true,  false, c===11, c===15);
  for (let r = 4;  r <= 8;  r++) { addBdr(r, 11, false, false, true, false); addBdr(r, 15, false, false, false, true); }
  for (let c = 11; c <= 15; c++) addBdr(9, c,  false, true,  c===11, c===15);

  // CONSIGNEE box: A(1)–D(4), rows 10–17
  for (let c = 1;  c <= 4;  c++) addBdr(10, c, true,  false, c===1,  c===4);
  for (let r = 11; r <= 16; r++) { addBdr(r, 1, false, false, true, false); addBdr(r, 4, false, false, false, true); }
  for (let c = 1;  c <= 4;  c++) addBdr(17, c, false, true,  c===1,  c===4);

  // NOTIFY PARTY box: F(6)–I(9), rows 10–17
  for (let c = 6;  c <= 9;  c++) addBdr(10, c, true,  false, c===6,  c===9);
  for (let r = 11; r <= 16; r++) { addBdr(r, 6, false, false, true, false); addBdr(r, 9, false, false, false, true); }
  for (let c = 6;  c <= 9;  c++) addBdr(17, c, false, true,  c===6,  c===9);

  // DATE row: K(11)–O(15), row 15 (merged K:O) — top + left + right
  for (let c = 11; c <= 15; c++) addBdr(15, c, true,  false, c===11, c===15);

  // INVOICE# row: K(11)–O(15), row 16 (merged K:O) — bottom + left + right
  for (let c = 11; c <= 15; c++) addBdr(16, c, false, true,  c===11, c===15);

  // Intermediary banking box: L(12)–O(15), rows 33–39
  for (let c = 12; c <= 15; c++) addBdr(33, c, true,  false, c===12, c===15);
  for (let r = 34; r <= 38; r++) { addBdr(r, 12, false, false, true, false); addBdr(r, 15, false, false, false, true); }
  for (let c = 12; c <= 15; c++) addBdr(39, c, false, true,  c===12, c===15);

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="JDM-Invoice-${invNo}.xlsx"`,
    },
  });
}
