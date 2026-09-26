// SBK Global LLC (US entity) invoice.
// Laid out cell-for-cell against the format the owner supplied: US company
// header, US bank details, stamp + signature, and the designation line with
// no signatory name.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/pg";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import fs from "fs";
import path from "path";

const CAN_DOWNLOAD = ["manager", "super_admin"];

const US_INFO = {
  company:    "SBK Global LLC",
  address:    "Address: Malcom Ct. SW, Prior Lake, MN 55372",
  web:        "www.sbkautotrading.com",
  email:      "Email: payments@sbkautotrading.com",
  phone:      "Contact: +1 612 451 0150 (USA) | +971 55 417 7311 (UAE) | +81 70 9427 5106 (Japan) | WhatsApp: +66 991983485 (Thailand)",
  bankTitle:  "SBK GLOBAL LLC",
  accountNo:  "217492201827",
  routing:    "101019628",
  officeAddr: "Prior Lake, Minnesota,  55372 USA",
  swift:      "TRWIUS35XXX",
  bankAddr1:  "Wise US Inc, 108 W 13th St,",
  bankAddr2:  "Wilmington, DE, 19801, United States",
};

const REMARKS_BODY =
  "\nPLEASE PAY BANK CHARGES OR PAYPAL CHARGES OR CREDIT CARD CHARGES.\n\nPLEASE READ TERMS AND CONDITION BELOW.";

const TERMS_HEAD = "Terms and Conditions:";

const TERMS_BODY =
  "\n1) All Customer payments shall be made through Telegraphic Transfer (TT), as according to the Country's prevailing Regulations.\n" +
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
    return c(Math.floor(x / 1000)) + "THOUSAND " + c(x % 1000);
  }
  return c(amt).trim();
}

const THIN = { style: "thin" as const };
const ALL  = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const LTB  = { left: THIN, top: THIN, bottom: THIN };
const GRAY = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFD9D9D9" }, bgColor: { argb: "FFD9D9D9" } };
// Same shade, stored the way the format stores it for rows 27 and 30: the
// theme background colour darkened 15%.
const GRAY_THEME = { type: "pattern" as const, pattern: "solid" as const, fgColor: { theme: 0, tint: -0.1499984740745262 }, bgColor: { indexed: 64 } };
const NAVY = "FF1F497D";
const RED  = "FFC00000";

// ExcelJS cannot write picture crops or picture effects, yet the format crops
// the logo and the signature and softens the signature (brightness +20%,
// contrast -40%, kept with an HD-photo layer). The drawing is patched after
// the workbook is written so every picture carries the format's own settings.
// Pictures are told apart by the cell their top-left corner sits in.
const A14_NS    = "http://schemas.microsoft.com/office/drawing/2010/main";
const R_NS      = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const LOCAL_DPI = `<a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}"><a14:useLocalDpi xmlns:a14="${A14_NS}" val="0"/></a:ext>`;

async function matchFormatPictures(xlsx: ArrayBuffer, signLayer: Buffer): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(xlsx);
  const drawingFile = zip.file("xl/drawings/drawing1.xml");
  const relsFile    = zip.file("xl/drawings/_rels/drawing1.xml.rels");
  const typesFile   = zip.file("[Content_Types].xml");
  if (!drawingFile || !relsFile || !typesFile) return xlsx;
  const [drawing, rels, types] = await Promise.all([
    drawingFile.async("string"), relsFile.async("string"), typesFile.async("string"),
  ]);

  const usedIds = [...rels.matchAll(/Id="rId(\d+)"/g)].map(m => Number(m[1]));
  const layerId = `rId${Math.max(0, ...usedIds) + 1}`;

  const patched = drawing.replace(/<xdr:twoCellAnchor[\s\S]*?<\/xdr:twoCellAnchor>/g, anchor => {
    const from  = anchor.match(/<xdr:from><xdr:col>(\d+)<\/xdr:col><xdr:colOff>\d+<\/xdr:colOff><xdr:row>(\d+)<\/xdr:row>/);
    const embed = anchor.match(/r:embed="(rId\d+)"/)?.[1];
    if (!from || !embed) return anchor;
    const blip = (ext: string) =>
      `<a:blip xmlns:r="${R_NS}" r:embed="${embed}" cstate="print"><a:extLst>${ext}</a:extLst></a:blip>`;
    let fill: string;
    switch (`${from[1]},${from[2]}`) {
      case "7,37": // signature
        fill = `<xdr:blipFill rotWithShape="1">${blip(
          `<a:ext uri="{BEBA8EAE-BF5A-486C-A8C5-ECC9F3942E4B}"><a14:imgProps xmlns:a14="${A14_NS}"><a14:imgLayer r:embed="${layerId}"><a14:imgEffect><a14:brightnessContrast bright="20000" contrast="-40000"/></a14:imgEffect></a14:imgLayer></a14:imgProps></a:ext>${LOCAL_DPI}`
        )}<a:srcRect l="13816" r="9210"/><a:stretch/></xdr:blipFill>`;
        break;
      case "6,1": // logo
        fill = `<xdr:blipFill rotWithShape="1">${blip(LOCAL_DPI)}<a:srcRect l="3929" t="8163"/><a:stretch/></xdr:blipFill>`;
        break;
      default: // stamp
        fill = `<xdr:blipFill>${blip(LOCAL_DPI)}<a:stretch><a:fillRect/></a:stretch></xdr:blipFill>`;
    }
    return anchor.replace(/<xdr:blipFill>[\s\S]*?<\/xdr:blipFill>/, fill);
  });

  zip.file("xl/drawings/drawing1.xml", patched);
  zip.file("xl/drawings/_rels/drawing1.xml.rels", rels.replace("</Relationships>",
    `<Relationship Id="${layerId}" Type="http://schemas.microsoft.com/office/2007/relationships/hdphoto" Target="../media/hdphoto1.wdp"/></Relationships>`));
  if (!types.includes('Extension="wdp"'))
    zip.file("[Content_Types].xml", types.replace("<Default ", '<Default Extension="wdp" ContentType="image/vnd.ms-photo"/><Default '));
  zip.file("xl/media/hdphoto1.wdp", signLayer);
  return zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !CAN_DOWNLOAD.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const row = await queryOne<Record<string, unknown>>(`SELECT * FROM invoices WHERE id = $1`, [id]);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  // A real date cell shown as d-mmm-yy (1-Sep-26), the way the format stores it
  const created     = new Date(inv.createdAt);
  const date        = new Date(Date.UTC(created.getFullYear(), created.getMonth(), created.getDate()));
  const docNo       = `K-${new Date(inv.createdAt).getFullYear().toString().slice(2)}-${String(id).slice(-5).toUpperCase()}`;
  const invNo       = `SBK${String(id).slice(-5).toUpperCase()}`;
  const advPct      = inv.advancePercent ?? 50;
  const advanceAmt  = Math.round(inv.cnfPrice * advPct / 100);
  const remaining   = inv.cnfPrice - advanceAmt;
  const words       = amountToWords(inv.cnfPrice);
  const salesPerson = inv.salesperson  || "TBA";
  const trFuel      = `${inv.transmission || "TBA"} ${inv.fuel || "TBA"}`;
  const yearLine    = inv.year || "—";

  const img = (name: string) => Buffer.from(fs.readFileSync(path.join(process.cwd(), "public", "images", name)));
  const logoBuffer  = img("sbk-us-logo.png");
  const stampBuffer = img("sbk-us-stamp.png");
  const signBuffer  = img("sbk-us-signature.png");
  const signLayer   = img("sbk-us-signature.wdp");

  const wb = new ExcelJS.Workbook();
  wb.creator = "SBK CRM";
  // The supplied format opens at 145% zoom — without this the sheet is laid
  // out identically but renders small on screen.
  const ws = wb.addWorksheet("INVOICE", {
    properties: { defaultRowHeight: 15, dyDescent: 0.25 },
    views: [{ state: "normal", showGridLines: true, zoomScale: 145, zoomScaleNormal: 145 }],
  });

  // ── Columns A–J ────────────────────────────────────────────────────────────
  const widths = [7.140625, 9, 9.5703125, 6.28515625, 11.7109375, 12.7109375, 6.28515625, 15.85546875, 10.28515625, 9.140625];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  for (let c = 1; c <= 10; c++) ws.getColumn(c).style = { font: { size: 7, name: "Calibri" } };

  // ── Page setup ─────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as any).pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: false,
    scale: 95,
    printArea: "A1:J55",
    horizontalCentered: true,
    margins: { left: 0.45, right: 0.45, top: 0.25, bottom: 0.25, header: 0.3, footer: 0.3 },
  };

  // ── Row heights ────────────────────────────────────────────────────────────
  ws.getRow(2).height  = 21;
  ws.getRow(9).height  = 21;
  [11, 12, 13, 14, 15, 19].forEach(r => { ws.getRow(r).height = 15; });
  ws.getRow(22).height = 24;
  ws.getRow(23).height = 25.5;
  [32, 33, 36, 37].forEach(r => { ws.getRow(r).height = 15; });

  // ── Images: logo top-right, stamp and signature above the designation ─────
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const logoId  = (wb as any).addImage({ buffer: logoBuffer,  extension: "png" });
  const stampId = (wb as any).addImage({ buffer: stampBuffer, extension: "png" });
  const signId  = (wb as any).addImage({ buffer: signBuffer,  extension: "png" });
  // Order matters: the signature PNG is opaque, so the stamp is placed last and
  // sits on top of it — the same order the supplied format uses.
  (ws as any).addImage(signId,  {
    tl: { nativeCol: 7, nativeColOff: 486759, nativeRow: 37, nativeRowOff: 52552  },
    br: { nativeCol: 8, nativeColOff: 543910, nativeRow: 42, nativeRowOff: 114054 }, editAs: "oneCell" });
  (ws as any).addImage(logoId,  {
    tl: { nativeCol: 6, nativeColOff: 180975, nativeRow: 1,  nativeRowOff: 38100  },
    br: { nativeCol: 9, nativeColOff: 580665, nativeRow: 5,  nativeRowOff: 57150  }, editAs: "oneCell" });
  (ws as any).addImage(stampId, {
    tl: { nativeCol: 5, nativeColOff: 480528, nativeRow: 37, nativeRowOff: 158569 },
    br: { nativeCol: 7, nativeColOff: 747100, nativeRow: 42, nativeRowOff: 134267 }, editAs: "oneCell" });
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // ── Cell helper ────────────────────────────────────────────────────────────
  function set(
    r: number, c: number, val: string | number | Date,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    opts: { bold?: boolean; size?: number; color?: string; fill?: any;
            h?: "left"|"center"|"right"; v?: "middle"|"top"|"bottom";
            wrap?: boolean; border?: any; } = {}
  ) {
    const cell = ws.getCell(r, c);
    cell.value = val;
    cell.font  = { name: "Calibri", size: opts.size ?? 8, bold: opts.bold ?? false,
                   color: opts.color ? { argb: opts.color } : undefined };
    cell.alignment = { horizontal: opts.h ?? "left", vertical: opts.v ?? "middle",
                       wrapText: opts.wrap ?? false };
    if (opts.fill)   cell.fill   = opts.fill;
    if (opts.border) cell.border = opts.border;
  }

  // ── Rows 2–7: company header ───────────────────────────────────────────────
  set(2, 1, US_INFO.company, { bold: true, size: 22, color: NAVY });
  set(4, 1, US_INFO.address, { bold: true, size: 9.5, color: RED });
  set(5, 1, US_INFO.web,     { bold: true, size: 9.5, color: RED });
  set(6, 1, US_INFO.email,   { bold: true, size: 9.5, color: RED });
  set(7, 1, US_INFO.phone,   { bold: true, size: 9.5, color: RED });

  // ── Row 9: "INVOICE" banner ────────────────────────────────────────────────
  ws.mergeCells(9, 1, 9, 10);
  set(9, 1, "INVOICE", { bold: true, size: 14, h: "center", fill: GRAY, border: ALL });

  // ── Row 10: "CONSIGNEE :" ─────────────────────────────────────────────────
  ws.mergeCells(10, 1, 10, 10);
  set(10, 1, "CONSIGNEE :", { bold: true, wrap: true, border: ALL });

  // ── Vertical separators between the three columns ─────────────────────────
  ws.mergeCells(11, 4, 21, 4); set(11, 4, "", { border: ALL });
  ws.mergeCells(11, 7, 21, 7); set(11, 7, "", { border: ALL });

  // ── Rows 11–16: consignee / invoice / shipping columns ────────────────────
  const leftLabels  = ["Name", "Address", "Port", "Country", "Phone", "EMAIL"];
  const leftVals    = [
    inv.consignee.name    || "",
    inv.consignee.address || "",
    inv.consignee.port    || "",
    inv.consignee.country || "",
    inv.consignee.phone   || "",
    inv.consignee.email   || "",
  ];
  const midLabels   = ["DATE", "DOCUMENT NO", "INVOICE", "SALES PERSON", "SHIPMENT TYPE", "INCOTERM"];
  const midVals     = [date, docNo, invNo, salesPerson, "RORO", "C&F"];
  const rightLabels = ["HAULIER", "VESSEL", "PORT OF LOADING", "PORT OF UNLOADING", "ETD", "COUNTRY"];
  const rightVals   = ["TBA", "TBA", "ANY", inv.consignee.port || "", "N/A", inv.consignee.country || ""];

  for (let i = 0; i < 6; i++) {
    const r = 11 + i;
    ws.mergeCells(r, 2, r, 3);
    ws.mergeCells(r, 9, r, 10);
    set(r, 1, leftLabels[i],  { wrap: true, border: ALL });
    set(r, 2, leftVals[i],    { wrap: true, border: ALL });
    set(r, 5, midLabels[i],   { wrap: true, border: ALL });
    set(r, 6, midVals[i],     { wrap: true, border: ALL });
    set(r, 8, rightLabels[i], { wrap: true, border: ALL });
    set(r, 9, rightVals[i],   { size: 7, wrap: true, border: ALL });
  }
  ws.getCell(11, 6).numFmt = "d-mmm-yy";

  ws.getCell(12, 1).border = { top: THIN, left: THIN, right: THIN };

  // ── Rows 17–21: notify party + payment terms ──────────────────────────────
  ws.mergeCells(17, 1, 17, 3);  set(17, 1, "", { h: "center", wrap: true, border: ALL });
  ws.mergeCells(17, 5, 21, 6);  set(17, 5, "", { h: "center", border: ALL });
  ws.mergeCells(17, 8, 19, 10); set(17, 8, "", { h: "center", border: ALL });

  ws.mergeCells(18, 1, 18, 3);
  set(18, 1, "NOTIFY PARTY :", { bold: true, wrap: true, border: ALL });

  ws.mergeCells(19, 1, 21, 3);
  set(19, 1, "Address (Same as above)", { wrap: true, border: ALL });

  set(20, 8, "PAYMENT TERMS", { bold: true, fill: GRAY, border: ALL });
  ws.mergeCells(20, 9, 20, 10);
  set(20, 9, ` ${advPct}% (Advance Payment)`, { bold: true, fill: GRAY, border: ALL });

  set(21, 8, "CURRENCY", { bold: true, fill: GRAY, border: ALL });
  ws.mergeCells(21, 9, 21, 10);
  set(21, 9, " US$", { bold: true, fill: GRAY, border: ALL });

  // ── Row 22: item table header ─────────────────────────────────────────────
  ws.mergeCells(22, 2, 22, 3);
  ws.mergeCells(22, 5, 22, 6);
  const hdr = (c: number, v: string) =>
    set(22, c, v, { bold: true, h: "center", wrap: true, fill: GRAY, border: ALL });
  hdr(1, "S.No."); hdr(2, "Chassis No. (STOCK ID)\nORIGIN"); hdr(4, "Qty");
  hdr(5, "DESCRIPTION & DETAILS"); hdr(7, "Year / CC"); hdr(8, "Transmission/Fuel");
  hdr(9, "C&F US$"); hdr(10, "TOTAL US$");

  // ── Row 23: the vehicle ───────────────────────────────────────────────────
  ws.mergeCells(23, 2, 23, 3);
  ws.mergeCells(23, 5, 23, 6);
  const itm = (c: number, v: string | number) =>
    set(23, c, v, { size: 7, h: "center", wrap: true, border: ALL });
  itm(1, 1); itm(2, `${inv.chassisNo}\nORIGIN: JAPAN`); itm(4, 1);
  itm(5, inv.unit); itm(7, yearLine); itm(8, trFuel);
  itm(9, inv.cnfPrice); itm(10, inv.cnfPrice);
  ws.getCell(23, 9).numFmt = ws.getCell(23, 10).numFmt = "#,##0";

  // ── Rows 24–26: totals ────────────────────────────────────────────────────
  const totals: [string, number][] = [
    ["TOTAL AMOUNT",      inv.cnfPrice],
    [`${advPct}% AMOUNT`, advanceAmt],
    ["Remaining Balance", remaining],
  ];
  totals.forEach(([label, val], i) => {
    const r = 24 + i;
    set(r, 1, "", { border: { left: THIN } });
    ws.mergeCells(r, 8, r, 9);
    set(r, 8, label, { bold: true, border: LTB });
    set(r, 10, val,  { bold: true, h: "center", border: ALL });
    ws.getCell(r, 10).numFmt = "#,##0";
  });

  // ── Rows 27–28: amount in words + invoice number ──────────────────────────
  ws.mergeCells(27, 1, 27, 10);
  set(27, 1, `TOTAL AMOUNT VALUE IN WORDS : ${words} US DOLLARS ONLY`, { bold: true, fill: GRAY_THEME, border: ALL });

  ws.mergeCells(28, 1, 28, 10);
  set(28, 1, `INVOICE : ${invNo}`, { bold: true, border: ALL });

  // ── Row 29: separator ─────────────────────────────────────────────────────
  ws.mergeCells(29, 1, 29, 10);

  // ── Rows 30–37: bank details (left) + remarks (right) ─────────────────────
  ws.mergeCells(30, 1, 30, 5);
  set(30, 1, "SHIPPER'S BANK DETAILS:", { bold: true, fill: GRAY_THEME, border: ALL });
  ws.mergeCells(30, 6, 37, 6);
  ws.mergeCells(30, 7, 37, 10);
  set(30, 7, "", { v: "top", wrap: true, border: ALL });
  ws.getCell(30, 7).value = { richText: [
    { text: "REMARKS:", font: { name: "Calibri", size: 8, bold: true, underline: true } },
    { text: REMARKS_BODY, font: { name: "Calibri", size: 8 } },
  ] };

  const bankRows: [string, string][] = [
    ["ACCOUNT TITLE",  US_INFO.bankTitle],
    ["ACCOUNT NO",     US_INFO.accountNo],
    ["ROUTING",        US_INFO.routing],
    ["OFFICE ADDRESS", US_INFO.officeAddr],
    ["SWIFT / BIC",    US_INFO.swift],
  ];
  bankRows.forEach(([label, value], i) => {
    const r = 31 + i;
    ws.mergeCells(r, 1, r, 2);
    ws.mergeCells(r, 3, r, 5);
    set(r, 1, label, { bold: true, wrap: true, border: ALL });
    set(r, 3, value, { bold: true, wrap: true, border: ALL });
  });

  // The bank address runs over two rows under a single label
  ws.mergeCells(36, 1, 37, 2);
  set(36, 1, "BANK ADDRESS", { bold: true, wrap: true, border: ALL });
  ws.mergeCells(36, 3, 36, 5); set(36, 3, US_INFO.bankAddr1, { bold: true, wrap: true, border: ALL });
  ws.mergeCells(37, 3, 37, 5); set(37, 3, US_INFO.bankAddr2, { bold: true, wrap: true, border: ALL });

  // ── Rows 38–43: stamp + signature area ────────────────────────────────────
  ws.mergeCells(38, 7, 43, 10);

  // ── Rows 44–45: designation, underlined ───────────────────────────────────
  ws.mergeCells(44, 7, 44, 10);
  set(44, 7, "Director International Sales", { bold: true, size: 10, h: "center" });
  ws.mergeCells(45, 7, 45, 10);
  set(45, 7, "", { bold: true, size: 10, h: "center", border: { bottom: THIN } });

  // ── Rows 46–54: terms and conditions ──────────────────────────────────────
  ws.mergeCells(46, 1, 54, 10);
  const tc = ws.getCell(46, 1);
  tc.value     = { richText: [
    { text: TERMS_HEAD, font: { name: "Calibri", size: 7, bold: true, underline: true } },
    { text: TERMS_BODY, font: { name: "Calibri", size: 7 } },
  ] };
  tc.font      = { name: "Calibri", size: 7 };
  tc.alignment = { horizontal: "left", vertical: "top", wrapText: true };
  tc.border    = { top: THIN };

  const buffer = await matchFormatPictures(await wb.xlsx.writeBuffer(), signLayer);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="SBK-US-Invoice-${invNo}.xlsx"`,
    },
  });
}
