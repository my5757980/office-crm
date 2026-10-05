import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/pg";
import { getInvoiceVehicles } from "@/lib/invoice-vehicles";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

const CAN_DOWNLOAD = ["manager", "super_admin"];

const SBK_INFO = {
  addr1:       "Address: Amber Gem Tower, Mezzanine Floor, Sheikh Khalifa Street,",
  addr2:       "P.O Box 4848, Ajman, United Arab Emirates",
  web:         "www.sbkautotrading.com",
  email:       "Email: payment@sbkautotrading.com",
  phone:       "Contact: +971 55 417 7311 (UAE) | +81 70 9427 5106 (Japan) | WhatsApp: +66 991983485 (Thailand)",
  bankAccount: "SBK GLOBAL AUTO TRADING FZC LLC",
  bankName:    "Emirates Islamic",
  bankBranch:  "EI Ibn Batuta Mall",
  bankAddress: "Dubai, United Arab Emirates",
  iban:        "AE020340003708512932302",
  accountNo:   "3708512932302",
  swift:       "MEBLAEADXXX",
};

const TERMS_TEXT =
  "Terms and Conditions:\n" +
  "1) All Customer payments shall be made through Telegraphic Transfer (TT), as according to the Country's prevailing Regulations.\n" +
  "2) Customer shall state the Proforma Invoice No. as reference for payment in the information area of the TT/SWIFT/LC application.\n" +
  "3) The proof of payment shall be emailed by the Customer to SBK Global Auto Trading which would be verified and receipted on realization of funds.\n" +
  "4) If the Deposit/Payment is not paid or LC not opened within the given Reservation Period of three (07) workings days or as per agreed Terms, the Exporter reserves the right to sell the vehicle to another customer.\n" +
  "5) The Issuing & Correspondence Bank charges shall be paid by the Customer.\n" +
  "6) The estimated shipment date would take place within three (03) weeks, after confirmation of satisfactory receipt of Customer Payment/LC Conditions.\n" +
  "7) Any amendment request for BL, after shipment instruction, shall incur USD50 on each such adjustment, charged to the customer.\n" +
  "8) Customer need to ensure balance payment within 1 week of the issuance of Bill of Lading, the Original Shipping Documents for Customs Clearance purpose shall be couriered/surrendered to the Customer upon full payment received.\n" +
  "9) Customer should settle timeously, and Customer shall not hold SBK Global Auto Trading responsible for any delay, arising from the payment delays, nor for any penalties incurred therewith.\n" +
  "10) Should there be any delay of payment or opening of LC or shipment confirmation on the part of Customer, additional Yard Fees would be charged to the Customer at USD 3/per day.";

function amountToWords(n: number): string {
  const amt = Math.round(n);
  if (amt === 0) return "ZERO";
  const ones = ["","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE",
    "TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN"];
  const tens = ["","","TWENTY","THIRTY","FORTY","FIFTY","SIXTY","SEVENTY","EIGHTY","NINETY"];
  function c(x: number): string {
    if (x === 0) return "";
    if (x < 20) return ones[x] + " ";
    if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? " " + ones[x % 10] : "") + " ";
    if (x < 1000) return ones[Math.floor(x / 100)] + " HUNDRED " + c(x % 100);
    // several vehicles on one invoice can pass a million
    if (x >= 1000000) return c(Math.floor(x / 1000000)) + "MILLION " + c(x % 1000000);
    return c(Math.floor(x / 1000)) + "THOUSAND " + c(x % 1000);
  }
  return c(amt).trim();
}

const THIN = { style: "thin" as const };
const ALL  = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const GRAY = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFD9D9D9" }, bgColor: { argb: "FFD9D9D9" } };
const NAVY = "FF1F497D";
const RED  = "FFC00000";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !CAN_DOWNLOAD.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const row = await queryOne<Record<string, unknown>>(`SELECT * FROM invoices WHERE id = $1`, [id]);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Every vehicle on the invoice gets its own item row. The format has three
  // item rows (23–25); more vehicles than that push everything below down.
  const vehicles  = await getInvoiceVehicles(id, row);
  const ITEM_ROWS = Math.max(3, vehicles.length);
  const X         = ITEM_ROWS - 3;
  const R         = (r: number) => r + X;   // a row below the item table

  const inv = {
    createdAt: row.created_at as string,
    advancePercent: row.advance_percent != null ? Number(row.advance_percent) : 50,
    cnfPrice: Number(row.cnf_price),
    salesperson: row.salesperson as string,
    transmission: row.transmission as string,
    fuel: row.fuel as string,
    year: row.year as string,
    consignee: {
      name: row.consignee_name as string,
      address: row.consignee_address as string,
      port: row.consignee_port as string,
      country: row.consignee_country as string,
      phone: row.consignee_phone as string,
      email: (row.consignee_email as string) || "",
    },
    chassisNo: row.chassis_no as string,
    unit: row.unit as string,
  };

  const date        = new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const docNo       = `K-${new Date(inv.createdAt).getFullYear().toString().slice(2)}-${String(id).slice(-5).toUpperCase()}`;
  const invNo       = `SBK${String(id).slice(-5).toUpperCase()}`;
  const advPct      = inv.advancePercent ?? 50;
  const advanceAmt  = Math.round(inv.cnfPrice * advPct / 100);
  const remaining   = inv.cnfPrice - advanceAmt;
  const words       = amountToWords(inv.cnfPrice);
  const salesPerson = inv.salesperson  || "TBA";
  const trFuel      = `${inv.transmission || "TBA"} ${inv.fuel || "TBA"}`;
  const yearLine    = inv.year || "—";

  const logoBuffer  = Buffer.from(fs.readFileSync(path.join(process.cwd(), "public", "images", "sbk-logo.jpg")));
  const stampBuffer = Buffer.from(fs.readFileSync(path.join(process.cwd(), "public", "images", "sbk-stamp.jpg")));

  const wb = new ExcelJS.Workbook();
  wb.creator = "SBK CRM";
  const ws = wb.addWorksheet("INVOICE");

  // ── Columns A–J (1–10) ─────────────────────────────────────────────────────
  ws.columns = [
    { width: 7.14  },  // A (1)
    { width: 9.00  },  // B (2)
    { width: 8.29  },  // C (3)
    { width: 6.29  },  // D (4)
    { width: 10.29 },  // E (5)
    { width: 12.71 },  // F (6)
    { width: 6.29  },  // G (7)
    { width: 13.86 },  // H (8)
    { width: 10.29 },  // I (9)
    { width: 9.14  },  // J (10)
  ];
  for (let c = 1; c <= 10; c++) {
    ws.getColumn(c).style = { font: { size: 7, name: "Calibri" } };
  }

  // ── Page setup ─────────────────────────────────────────────────────────────
  (ws as any).pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: false,
    // Up to three vehicles use the format's own rows. Beyond that each extra
    // row (25.5pt) is offset by shrinking in proportion to the original sheet
    // (937.5pt tall at 100%, measured in Excel), so it prints as it always did.
    scale: X === 0 ? 100 : Math.floor(100 * 937.5 / (937.5 + 25.5 * X)),
    printArea: `A1:J${R(59)}`,
    horizontalCentered: true,
    margins: { left: 0.45, right: 0.45, top: 0.25, bottom: 0.25, header: 0.3, footer: 0.3 },
  };

  // ── Row heights ────────────────────────────────────────────────────────────
  ws.getRow(2).height  = 21;
  ws.getRow(9).height  = 21;
  ws.getRow(22).height = 24;
  for (let r = 23; r < 23 + ITEM_ROWS; r++) ws.getRow(r).height = 25.5;

  // ── Images ─────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logoId  = (wb as any).addImage({ buffer: logoBuffer,  extension: "jpeg" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stampId = (wb as any).addImage({ buffer: stampBuffer, extension: "jpeg" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as any).addImage(logoId,  { tl: { col: 6,   row: 0  }, ext: { width: 246, height: 93 }, editAs: "oneCell" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as any).addImage(stampId, { tl: { col: 7.2, row: R(39) }, br: { col: 9.0, row: R(47) }, editAs: "oneCell" });

  // ── Cell helper ────────────────────────────────────────────────────────────
  function set(
    r: number, c: number, val: string | number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    opts: { bold?: boolean; size?: number; color?: string; fill?: any;
            h?: "left"|"center"|"right"; v?: "middle"|"top"|"bottom";
            wrap?: boolean; border?: any; numFmt?: string; } = {}
  ) {
    const cell = ws.getCell(r, c);
    cell.value = val;
    cell.font  = { name: "Calibri", size: opts.size ?? 7, bold: opts.bold ?? false,
                   color: opts.color ? { argb: opts.color } : undefined };
    cell.alignment = { horizontal: opts.h ?? "left", vertical: opts.v ?? "middle",
                       wrapText: opts.wrap ?? false };
    if (opts.fill)   cell.fill   = opts.fill;
    if (opts.border) cell.border = opts.border;
    if (opts.numFmt) cell.numFmt = opts.numFmt;
  }

  // ── Row 2: Company name ────────────────────────────────────────────────────
  set(2, 1, "SBK Global Auto Trading FZC LLC", { bold: true, size: 16, color: NAVY });

  // ── Rows 3–7: Address / contact (red) ─────────────────────────────────────
  set(3, 1, SBK_INFO.addr1, { bold: true, size: 8, color: RED });
  set(4, 1, SBK_INFO.addr2, { bold: true, size: 8, color: RED });
  set(5, 1, SBK_INFO.web,   { bold: true, size: 8, color: RED });
  set(6, 1, SBK_INFO.email, { bold: true, size: 8, color: RED });
  set(7, 1, SBK_INFO.phone, { bold: true, size: 8, color: RED });

  // ── Row 9: "INVOICE" header (A9:J9) ───────────────────────────────────────
  ws.mergeCells(9, 1, 9, 10);
  set(9, 1, "INVOICE", { bold: true, size: 14, h: "center", fill: GRAY, border: ALL });

  // ── Row 10: "CONSIGNEE :" header (A10:J10) ────────────────────────────────
  ws.mergeCells(10, 1, 10, 10);
  set(10, 1, "CONSIGNEE :", { bold: true, wrap: true, border: ALL });

  // ── D11:D21 vertical separator ────────────────────────────────────────────
  ws.mergeCells(11, 4, 21, 4);
  ws.getCell(11, 4).border = ALL;

  // ── G11:G21 vertical separator ────────────────────────────────────────────
  ws.mergeCells(11, 7, 21, 7);
  ws.getCell(11, 7).border = ALL;

  // ── Rows 11–16: consignee labels + values + right grid ───────────────────
  const leftLabels  = ["Name", "Address", "Port", "Country", "Phone", "Email"];
  const leftVals    = [
    `: ${inv.consignee.name    || ""}`,
    `: ${inv.consignee.address || ""}`,
    `: ${inv.consignee.port    || ""}`,
    `: ${inv.consignee.country || ""}`,
    `: ${inv.consignee.phone   || ""}`,
    `: ${inv.consignee.email   || ""}`,
  ];
  const midLabels   = ["DATE", "DOCUMENT NO", "INVOICE", "SALES PERSON", "SHIPMENT TYPE", "INCOTERM"];
  const midVals     = [`: ${date}`, `: ${docNo}`, `: ${invNo}`, `: ${salesPerson}`, ": RORO", ": C&F"];
  const rightLabels = ["HAULIER", "VESSEL", "PORT OF LOADING", "PORT OF UNLOADING", "ETD", "COUNTRY"];
  const rightVals   = [": TBA", ": TBA", ": ANY",
    `: ${inv.consignee.port    || ""}`,
    ": N/A",
    `: ${inv.consignee.country || ""}`,
  ];

  for (let i = 0; i < 6; i++) {
    const r = 11 + i;
    ws.mergeCells(r, 2, r, 3);
    ws.mergeCells(r, 9, r, 10);
    set(r, 1, leftLabels[i],  { border: ALL, wrap: true });
    set(r, 2, leftVals[i],    { border: ALL, wrap: true });
    set(r, 5, midLabels[i],   { border: ALL, wrap: true });
    set(r, 6, midVals[i],     { border: ALL, wrap: true });
    set(r, 8, rightLabels[i], { border: ALL, wrap: true });
    set(r, 9, rightVals[i],   { border: ALL, wrap: true });
  }

  // ── Rows 17–21: NOTIFY PARTY + payment terms ──────────────────────────────
  ws.mergeCells(17, 1, 17, 3);
  ws.mergeCells(18, 1, 18, 3);
  ws.mergeCells(19, 1, 19, 3);
  ws.mergeCells(20, 1, 21, 3);
  ws.mergeCells(17, 5, 21, 6);
  ws.mergeCells(17, 8, 19, 10);
  ws.mergeCells(20, 9, 20, 10);
  ws.mergeCells(21, 9, 21, 10);

  ws.getCell(17, 1).border = ALL;
  ws.getCell(17, 5).border = ALL;
  ws.getCell(17, 8).border = ALL;

  set(18, 1, "NOTIFY PARTY :", { bold: true, wrap: true, border: ALL });
  set(19, 1, "Same as consignee", { wrap: true, border: ALL });
  ws.getCell(20, 1).border = ALL;

  set(20, 8, "PAYMENT TERMS", { bold: true, fill: GRAY, border: ALL });
  set(20, 9, `${advPct}% (Advance Payment)`, { bold: true, h: "left", fill: GRAY, border: ALL });
  set(21, 8, "CURRENCY",  { bold: true, fill: GRAY, border: ALL });
  set(21, 9, " US$",      { bold: true, h: "left", fill: GRAY, border: ALL });

  // ── Row 22: table header ───────────────────────────────────────────────────
  ws.mergeCells(22, 2, 22, 3);
  ws.mergeCells(22, 5, 22, 6);
  const TH = { bold: true, fill: GRAY, border: ALL, h: "center" as const, v: "middle" as const, wrap: true };
  set(22, 1,  "S.No.",                              TH);
  set(22, 2,  "Chassis No. (STOCK ID)\nORIGIN",     TH);
  set(22, 4,  "Qty",                                TH);
  set(22, 5,  "DESCRIPTION & DETAILS",              TH);
  set(22, 7,  "Year / CC",                          TH);
  set(22, 8,  "Transmission/Fuel",                  TH);
  set(22, 9,  "C&F US$",                            TH);
  set(22, 10, "TOTAL US$",                          TH);

  // ── Rows 23+: one row per vehicle, then the empty bordered rows ───────────
  const VD = { h: "center" as const, v: "middle" as const, border: ALL, wrap: true };
  for (let i = 0; i < ITEM_ROWS; i++) {
    const r = 23 + i;
    ws.mergeCells(r, 2, r, 3);
    ws.mergeCells(r, 5, r, 6);
    const v = vehicles[i];
    if (v) {
      // a single-vehicle invoice prints exactly what it always printed
      const one   = vehicles.length === 1;
      const price = one ? inv.cnfPrice : v.cnfPrice;
      set(r, 1,  i + 1,                                                        VD);
      set(r, 2,  `${(one ? inv.chassisNo : v.chassisNo) || "—"}\nORIGIN: JAPAN`, VD);
      set(r, 4,  1,                                                            VD);
      set(r, 5,  (one ? inv.unit : v.unit) || "—",                             VD);
      set(r, 7,  one ? yearLine : v.year || "—",                               VD);
      set(r, 8,  one ? trFuel : `${v.transmission || "TBA"} ${v.fuel || "TBA"}`, VD);
      set(r, 9,  price, { ...VD, numFmt: "#,##0" });
      set(r, 10, price, { ...VD, numFmt: "#,##0" });
    } else {
      for (let c = 1; c <= 10; c++) {
        if (c === 3 || c === 6) continue;
        ws.getCell(r, c).border = ALL;
      }
    }
  }

  // ── Rows 26–28: summary ────────────────────────────────────────────────────
  ws.mergeCells(R(26), 8, R(26), 9);
  ws.mergeCells(R(27), 8, R(27), 9);
  ws.mergeCells(R(28), 8, R(28), 9);
  const SL = { bold: true, border: { left: THIN, top: THIN, bottom: THIN } };
  set(R(26), 8, "TOTAL AMOUNT",    SL);
  set(R(27), 8, `${advPct}% AMOUNT`, SL);
  set(R(28), 8, "Remaining Balance", SL);
  for (const [r, v] of [[R(26), inv.cnfPrice], [R(27), advanceAmt], [R(28), remaining]] as [number,number][]) {
    set(r, 10, v, { bold: true, h: "center", numFmt: "#,##0", border: ALL });
  }

  // ── Row 29: total in words (A29:J29) ──────────────────────────────────────
  ws.mergeCells(R(29), 1, R(29), 10);
  set(R(29), 1, `TOTAL AMOUNT VALUE IN WORDS : ${words} US DOLLARS ONLY`,
    { bold: true, border: { left: THIN, top: THIN, bottom: THIN } });

  // ── Row 30: invoice# (A30:J30) ────────────────────────────────────────────
  ws.mergeCells(R(30), 1, R(30), 10);
  set(R(30), 1, `INVOICE : ${invNo}`,
    { bold: true, border: { left: THIN, top: THIN, bottom: THIN } });

  // ── Row 31: separator (A31:J31) ───────────────────────────────────────────
  ws.mergeCells(R(31), 1, R(31), 10);

  // ── Rows 32–39: bank details (left) + remarks (right) ─────────────────────
  ws.mergeCells(R(32), 1, R(32), 5);
  ws.mergeCells(R(32), 6, R(39), 6);
  ws.mergeCells(R(32), 7, R(39), 10);

  set(R(32), 1, "SHIPPER'S BANK DETAILS:", { bold: true, border: ALL });
  set(R(32), 7,
    "REMARKS:\nPLEASE PAY BANK CHARGES OR PAYPAL CHARGES OR CREDIT CARD CHARGES.\n\nPLEASE READ TERMS AND CONDITION BELOW.",
    { h: "left", v: "top", wrap: true, border: ALL });

  const bankRows: [string, string][] = [
    ["ACCOUNT",     SBK_INFO.bankAccount],
    ["BANK",        SBK_INFO.bankName],
    ["BRANCH",      SBK_INFO.bankBranch],
    ["ADDRESS",     SBK_INFO.bankAddress],
    ["IBAN",        SBK_INFO.iban],
    ["ACCOUNT NO:", SBK_INFO.accountNo],
    ["SWIFT CODE:", SBK_INFO.swift],
  ];
  bankRows.forEach(([label, value], i) => {
    const r = R(33) + i;
    ws.mergeCells(r, 1, r, 2);
    ws.mergeCells(r, 3, r, 5);
    set(r, 1, label, { bold: true, wrap: true, border: ALL });
    set(r, 3, value, { bold: true, wrap: true, border: ALL });
  });

  // ── Rows 40–47: stamp image area ──────────────────────────────────────────
  ws.mergeCells(R(40), 7, R(47), 10);

  // ── Row 48: director name ─────────────────────────────────────────────────
  ws.mergeCells(R(48), 7, R(48), 10);
  set(R(48), 7, "SM Khurram Rashid", {
    bold: true, size: 10, h: "center",
  });

  // ── Row 49: director title ────────────────────────────────────────────────
  ws.mergeCells(R(49), 7, R(49), 10);
  set(R(49), 7, "Director International Sales", {
    bold: true, size: 10, h: "center",
    border: { bottom: THIN },
  });

  // ── Rows 50–59: terms and conditions ──────────────────────────────────────
  ws.mergeCells(R(50), 1, R(59), 10);
  const tc = ws.getCell(R(50), 1);
  tc.value     = TERMS_TEXT;
  tc.font      = { name: "Calibri", size: 6 };
  tc.alignment = { horizontal: "left", vertical: "top", wrapText: true };
  tc.border    = { top: THIN };

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="SBK-Invoice-${invNo}.xlsx"`,
    },
  });
}
