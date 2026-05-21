// Test script — generates sample SBK Word + JDM Excel for visual comparison
// Run: node scripts/gen-test-docs.mjs
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
  AlignmentType, WidthType, BorderStyle, VerticalMergeType, ImageRun,
} from "docx";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT  = path.join(__dirname, "test-output");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

// ─── Sample invoice data (matching original templates) ───────────────────────
const inv = {
  _id: "TEST00001",
  createdAt: new Date("2025-07-05"),
  unit: "Honda CR-V 2016",
  chassisNo: "JHLRM4H54GC012345",
  engineNo: "2,400 cc",
  color: "WHITE",
  year: "2016",
  salesperson: "SM Khurram Rashid",
  fuel: "PETROL",
  transmission: "AUTOMATIC",
  cnfPrice: 18000,
  advancePercent: 50,
  consignee: {
    name: "FATIMA TRADING LLC",
    address: "Al Nahda Street, Sharjah, UAE",
    phone: "+971 50 123 4567",
    port: "PORT OF SHARJAH",
    country: "United Arab Emirates",
  },
};

// ─── SBK Word ─────────────────────────────────────────────────────────────────
const COLS = [397, 289, 509, 621, 54, 2670, 1249, 966, 626, 1315, 1080, 1014];

const SBK_INFO = {
  addr1: "Address: Amber Gem Tower, Mezzanine Floor, Sheikh Khalifa Street,",
  addr2: "P.O Box 4848, Ajman, United Arab Emirates",
  web:   "www.sbkautotrading.com",
  email: "Email: payment@sbkautotrading.com",
  phone: "Contact: +971 55 417 7311 (UAE) | +81 3 5050 0251 (Japan) | WhatsApp: +66 991983485 (Thailand)",
  bankAccount: "SBK GLOBAL AUTO TRADING FZC LLC",
  bankName:    "Emirates Islamic",
  bankBranch:  "EI Ibn Batuta Mall",
  bankAddress: "Dubai, United Arab Emirates",
  iban:        "AE020340003708512932302",
  accountNo:   "3708512932302",
  swift:       "MEBLAEADXXX",
  remarks:     "REMARKS:\nPLEASE PAY BANK CHARGES OR PAYPAL CHARGES OR CREDIT CARD CHARGES. \n\nPLEASE READ TERMS AND CONDITION BELOW.",
};

const TERMS = [
  "All Customer payments shall be made through Telegraphic Transfer (TT), as according to the Country's prevailing Regulations.",
  "Customer shall state the Proforma Invoice No. as reference for payment in the information area of the TT/SWIFT/LC application.",
  "The proof of payment shall be emailed by the Customer to SBK Global Auto Trading which would be verified and receipted on realization of funds.",
  "If the Deposit/Payment is not paid or LC not opened within the given Reservation Period of three (07) workings days or as per agreed Terms, the Exporter reserves the right to sell the vehicle to another customer.",
  "The Issuing & Correspondence Bank charges shall be paid by the Customer.",
  "The estimated shipment date would take place within three (03) weeks, after confirmation of satisfactory receipt of Customer Payment/LC Conditions.",
  "Any amendment request for BL, after shipment instruction, shall incur USD50 on each such adjustment, charged to the customer.",
  "Customer need to ensure balance payment within 1 week of the issuance of Bill of Lading, the Original Shipping Documents for Customs Clearance purpose shall be couriered/surrendered to the Customer upon full payment received.",
  "Customer should settle timeously, and Customer shall not hold SBK Global Auto Trading responsible for any delay, arising from the payment delays, nor for any penalties incurred therewith.",
  "Should there be any delay of payment or opening of LC or shipment confirmation on the part of Customer, additional Yard Fees would be charged to the Customer at USD 3/per day.",
];

function amountToWords(n) {
  const amt = Math.round(n);
  if (amt === 0) return "ZERO";
  const ones = ["","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE","TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN"];
  const tens = ["","","TWENTY","THIRTY","FORTY","FIFTY","SIXTY","SEVENTY","EIGHTY","NINETY"];
  function c(x) {
    if (x === 0) return "";
    if (x < 20) return ones[x] + " ";
    if (x < 100) return tens[Math.floor(x/10)] + (x%10 ? " "+ones[x%10] : "") + " ";
    if (x < 1000) return ones[Math.floor(x/100)] + " HUNDRED " + c(x%100);
    return c(Math.floor(x/1000)) + "THOUSAND " + c(x%1000);
  }
  return c(amt).trim();
}

function fmt(n) { return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }

const THIN = { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" };
const ALL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const NONE = { style: BorderStyle.NONE, size: 0, color: "auto" };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE };

function makeCell(def) {
  const sz = (def.size ?? 7) * 2;
  const align = def.align === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT;
  const paragraphs = def.lines.map(line =>
    new Paragraph({
      alignment: align,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: line, bold: def.bold ?? false, size: sz, font: "Calibri" })],
    })
  );
  const opts = {
    children: paragraphs,
    borders: ALL_BORDERS,
    margins: { top: 30, bottom: 30, left: 80, right: 80 },
  };
  if (def.colSpan && def.colSpan > 1) opts.columnSpan = def.colSpan;
  if (def.shade) opts.shading = { fill: def.shade, type: "clear", color: "auto" };
  if (def.vMerge === "restart") opts.verticalMerge = VerticalMergeType.RESTART;
  if (def.vMerge === "continue") opts.verticalMerge = VerticalMergeType.CONTINUE;
  return new TableCell(opts);
}

function row(...cells) { return new TableRow({ children: cells.map(makeCell) }); }
function empty(colSpan = 1) { return { lines: [""], colSpan }; }

function hdrPara(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: opts.after ?? 20, before: 0 },
    children: [new TextRun({ text, bold: opts.bold ?? true, size: (opts.size ?? 8) * 2, color: opts.color ?? "000000", font: "Calibri" })],
  });
}

function termPara(text, num) {
  return new Paragraph({
    alignment: AlignmentType.BOTH,
    spacing: { after: 0, before: 0 },
    children: [new TextRun({ text: `${num}. ${text}`, size: 6 * 2, font: "Calibri" })],
  });
}

async function genSBK() {
  const logoBuffer  = fs.readFileSync(path.join(ROOT, "public", "images", "sbk-logo.jpg"));
  const stampBuffer = fs.readFileSync(path.join(ROOT, "public", "images", "sbk-stamp.jpg"));

  const date        = inv.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const docNo       = `K-${inv.createdAt.getFullYear().toString().slice(2)}-${inv._id.slice(-5).toUpperCase()}`;
  const invNo       = `SBK${inv._id.slice(-5).toUpperCase()}`;
  const advPct      = inv.advancePercent ?? 50;
  const advanceAmt  = Math.round(inv.cnfPrice * advPct / 100);
  const remaining   = inv.cnfPrice - advanceAmt;
  const words       = amountToWords(inv.cnfPrice);
  const salesPerson = inv.salesperson || "TBA";
  const transmission= inv.transmission || "TBA";
  const fuel        = inv.fuel || "TBA";
  const yearLine    = inv.year || "—";
  const engineLine  = inv.engineNo || "—";

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideH: NONE, insideV: NONE },
    columnWidths: [8790, 2000],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: NO_BORDERS,
            children: [
              hdrPara("SBK Global Auto Trading FZC LLC", { size: 16, color: "1F497D", after: 20 }),
              hdrPara(SBK_INFO.addr1, { size: 8, color: "C00000", after: 20 }),
              hdrPara(SBK_INFO.addr2, { size: 8, color: "C00000", after: 20 }),
              hdrPara(SBK_INFO.web,   { size: 8, color: "C00000", after: 20 }),
              hdrPara(SBK_INFO.email, { size: 8, color: "C00000", after: 20 }),
              hdrPara(SBK_INFO.phone, { size: 8, color: "C00000", after: 0 }),
            ],
          }),
          new TableCell({
            borders: NO_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0 },
                children: [new ImageRun({ data: logoBuffer, transformation: { width: 140, height: 110 }, type: "jpg" })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 600, bottom: 600, left: 720, right: 720 } } },
      children: [
        headerTable,
        new Paragraph({ spacing: { after: 60 }, children: [] }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: COLS,
          rows: [
            row({ lines: ["CONSIGNEE :"], bold: true, colSpan: 6 }, { lines: ["DATE"] }, { lines: [`: ${date}`], colSpan: 2 }, { lines: ["HAULER\t: TBA"], colSpan: 3 }),
            row({ lines: ["Name"], colSpan: 2 }, { lines: [inv.consignee.name], colSpan: 4 }, { lines: ["DOCUMENT NO"] }, { lines: [`: ${docNo}`], colSpan: 2 }, { lines: ["VESSEL\t: TBA"], colSpan: 3 }),
            row({ lines: ["Address"], colSpan: 2 }, { lines: [inv.consignee.address], colSpan: 4 }, { lines: ["INVOICE"] }, { lines: [`: ${invNo}`], colSpan: 2 }, { lines: ["PORT OF LOADING\t: ANY"], colSpan: 3 }),
            row({ lines: ["Port"], colSpan: 2 }, { lines: [inv.consignee.port], colSpan: 4 }, { lines: ["SALES PERSON"] }, { lines: [`: ${salesPerson}`], colSpan: 2 }, { lines: [`PORT OF UNLOADING\t: ${inv.consignee.port}`], colSpan: 3 }),
            row({ lines: ["Country"], colSpan: 2 }, { lines: [inv.consignee.country], colSpan: 4 }, { lines: ["SHIPMENT TYPE"] }, { lines: [": RORO"], colSpan: 2 }, { lines: ["ETD\t: TBA"], colSpan: 3 }),
            row({ lines: ["Phone"], colSpan: 2 }, { lines: [inv.consignee.phone], colSpan: 4 }, { lines: ["INCOTERM"] }, { lines: [": C&F"], colSpan: 2 }, { lines: [`COUNTRY\t: ${inv.consignee.country}`], colSpan: 3 }),
            row({ lines: ["Email"], colSpan: 2 }, { lines: ["—"], colSpan: 4 }, empty(1), empty(2), empty(3)),
            row({ lines: ["NOTIFY PARTY :"], bold: true, colSpan: 6 }, empty(1), empty(2), empty(3)),
            row({ lines: ["Same as consignee"], bold: true, colSpan: 12 }),
            row(empty(9), { lines: [`PAYMENT TERMS\t: ${advPct}% (Advance Payment)`], bold: true, colSpan: 3, shade: "BFBFBF" }),
            row(empty(9), { lines: ["CURRENCY\t: US$"], bold: true, colSpan: 3 }),
            row(
              { lines: ["S.No"], bold: true, shade: "BFBFBF" },
              { lines: ["Chassis No. (STOCK ID)","ORIGIN"], bold: true, shade: "BFBFBF", colSpan: 3 },
              { lines: ["DESCRIPTION & DETAILS"], bold: true, shade: "BFBFBF", colSpan: 2 },
              { lines: ["YEAR MONTH & ENGINE CC"], bold: true, shade: "BFBFBF" },
              { lines: ["TRANS & FUEL"], bold: true, shade: "BFBFBF", colSpan: 2 },
              { lines: ["QTY"], bold: true, shade: "BFBFBF" },
              { lines: ["C&F US$"], bold: true, shade: "BFBFBF" },
              { lines: ["TOTAL US$"], bold: true, shade: "BFBFBF" },
            ),
            row({ lines: ["VEHICLE(S)"], bold: true, colSpan: 12 }),
            row(
              { lines: ["1"] },
              { lines: [inv.chassisNo, "ORIGIN: JAPAN"], colSpan: 3 },
              empty(1),
              { lines: [inv.unit] },
              { lines: [yearLine, engineLine] },
              { lines: [transmission, fuel], colSpan: 2 },
              { lines: ["1"] },
              { lines: [fmt(inv.cnfPrice)] },
              { lines: [fmt(inv.cnfPrice)] },
            ),
            row(empty(), empty(3), empty(4), { lines: ["Total Amount"], bold: true, colSpan: 3 }, { lines: [fmt(inv.cnfPrice)], bold: true }),
            row(empty(), empty(3), empty(4), { lines: [`${advPct}% Amount`], bold: true, colSpan: 3 }, { lines: [fmt(advanceAmt)], bold: true }),
            row(empty(), empty(3), empty(4), { lines: ["Remaining Balance"], bold: true, colSpan: 3, shade: "BFBFBF" }, { lines: [fmt(remaining)], bold: true, shade: "BFBFBF" }),
            row({ lines: [`TOTAL AMOUNT VALUE IN WORDS : ${words} US DOLLARS ONLY`], bold: true, colSpan: 9 }, empty(3)),
            row({ lines: [`INVOICE : ${invNo}`], bold: true, colSpan: 9 }, empty(3)),
            row({ lines: ["", "SHIPPER'S BANK DETAILS:"], bold: true, colSpan: 8 }, { lines: SBK_INFO.remarks.split("\n"), colSpan: 4, vMerge: "restart" }),
            row({ lines: ["ACCOUNT:"],  bold: true, colSpan: 3 }, { lines: [SBK_INFO.bankAccount], bold: true, colSpan: 3 }, empty(2), { lines: [""], colSpan: 4, vMerge: "continue" }),
            row({ lines: ["BANK:"],     bold: true, colSpan: 3 }, { lines: [SBK_INFO.bankName],    bold: true, colSpan: 3 }, empty(2), { lines: [""], colSpan: 4, vMerge: "continue" }),
            row({ lines: ["BRANCH:"],   bold: true, colSpan: 3 }, { lines: [SBK_INFO.bankBranch],  bold: true, colSpan: 3 }, empty(2), { lines: [""], colSpan: 4, vMerge: "continue" }),
            row({ lines: ["ADDRESS:"],  bold: true, colSpan: 3 }, { lines: [SBK_INFO.bankAddress], bold: true, colSpan: 3 }, empty(2), { lines: [""], colSpan: 4, vMerge: "continue" }),
            row({ lines: ["IBAN:"],     bold: true, colSpan: 3 }, { lines: [SBK_INFO.iban],        bold: true, colSpan: 3 }, empty(2), { lines: [""], colSpan: 4, vMerge: "continue" }),
            row({ lines: ["ACCOUNT NO:"], bold: true, colSpan: 3 }, { lines: [SBK_INFO.accountNo], bold: true, colSpan: 3 }, empty(2), empty(4)),
            row({ lines: ["SWIFT CODE:"], bold: true, colSpan: 3 }, { lines: [SBK_INFO.swift],     bold: true, colSpan: 3 }, empty(2), empty(4)),
            new TableRow({
              children: [
                new TableCell({
                  columnSpan: 6,
                  borders: ALL_BORDERS,
                  margins: { top: 30, bottom: 30, left: 80, right: 80 },
                  children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [] })],
                }),
                new TableCell({
                  columnSpan: 6,
                  borders: ALL_BORDERS,
                  margins: { top: 30, bottom: 30, left: 80, right: 80 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      spacing: { before: 0, after: 0 },
                      children: [
                        new ImageRun({ data: stampBuffer, transformation: { width: 100, height: 100 }, type: "jpg" }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            row(empty(6), { lines: [salesPerson, "Director International Sales"], bold: true, colSpan: 6, align: "right" }),
          ],
        }),

        new Paragraph({ spacing: { after: 40 }, children: [] }),
        new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "Terms and Conditions:", font: "Calibri" })] }),
        ...TERMS.map((t, i) => termPara(t, i + 1)),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(OUT, "test-sbk.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("SBK Word saved:", outPath);
}

// ─── JDM Excel ────────────────────────────────────────────────────────────────
const JDM = {
  name:        "JDM TRADING CO. LTD",
  addr1:       "NAGOYASHI MIDORI-KU-SHIKAYAMA",
  addr2:       "2-1-1- ROYAL SHIKAYAMA A503, JAPAN",
  tel:         "TEL: +81-52-755-0916 FAX: +81-52-717-7427",
  email:       "info@jdm-trading.com",
  bankBranch1: "1-203, TAKBATA, NAKAGAWA-KU,",
  bankBranch2: "NAGOYA-SHI, AICHI 454-0911, JAPAN",
  bankName:    "MITSUBISHI UFJ",
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

const XTHIN = { style: "thin" };

function xborder(cell) {
  cell.border = { top: XTHIN, bottom: XTHIN, left: XTHIN, right: XTHIN };
}

function xhdr(ws, r, c, val) {
  const cell = ws.getCell(r, c);
  cell.value = val;
  cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1a1a2e" } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  xborder(cell);
}

function xdat(ws, r, c, val, opts = {}) {
  const cell = ws.getCell(r, c);
  cell.value = val;
  cell.font = { bold: opts.bold, size: 9 };
  cell.alignment = { horizontal: opts.align ?? (typeof val === "number" ? "right" : "left"), vertical: "middle", wrapText: true };
  if (opts.numFmt) cell.numFmt = opts.numFmt;
  xborder(cell);
}

function xlbl(ws, r, c, val, size = 9) {
  const cell = ws.getCell(r, c);
  cell.value = val;
  cell.font = { size };
  cell.alignment = { vertical: "middle" };
}

async function genJDM() {
  const date      = inv.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const invNo     = `JDM-${inv._id.slice(-5).toUpperCase()}`;
  const advPct    = inv.advancePercent ?? 50;
  const advAmt    = Math.round(inv.cnfPrice * advPct / 100);
  const remaining = inv.cnfPrice - advAmt;
  const unitParts = inv.unit.split(" ");
  const make      = unitParts[0] ?? inv.unit;
  const model     = unitParts.slice(1).join(" ") || inv.unit;

  const logoBuffer = fs.readFileSync(path.join(ROOT, "public", "images", "jdm-logo.png"));

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("INVOICE");

  // 15 columns A–O
  ws.columns = [
    { width: 8.86 }, { width: 9.0  }, { width: 7.0  }, { width: 8.0  }, { width: 8.0  },
    { width: 7.0  }, { width: 7.86 }, { width: 7.0  }, { width: 7.14 }, { width: 6.57 },
    { width: 8.86 }, { width: 11.0 }, { width: 7.0  }, { width: 9.0  }, { width: 17.29 },
  ];
  // Default font size 10 to match original
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

  // Logo image (rows 1-2, col A)
  const logoImgId = wb.addImage({ buffer: logoBuffer, extension: "png" });
  ws.addImage(logoImgId, { tl: { col: 0, row: 0 }, ext: { width: 200, height: 80 } });
  ws.getRow(1).height = 45;
  ws.getRow(2).height = 45;

  function jset(r, c, val, opts = {}) {
    const cell = ws.getCell(r, c);
    cell.value = val;
    cell.font = { bold: opts.bold ?? false, size: opts.size ?? 10, color: opts.color ? { argb: opts.color } : undefined, underline: opts.underline ? "single" : undefined };
    cell.alignment = { horizontal: opts.h ?? "left", vertical: "middle", wrapText: opts.wrap ?? false };
    if (opts.numFmt) cell.numFmt = opts.numFmt;
  }
  function jhdr(r, c, val) {
    jset(r, c, val, { bold: true, color: "FFFFFFFF", h: "center" });
    ws.getCell(r, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } };
    xborder(ws.getCell(r, c));
  }
  function jbdr(r, c) { xborder(ws.getCell(r, c)); }

  ws.getRow(1).height = 10;
  ws.getRow(2).height = 10;

  // R3: company name (E=5) + banking label (K=11)
  ws.getRow(3).height = 19.5;
  jset(3, 5,  JDM.name,                          { bold: true, size: 15, color: "FF8B0000" });
  jset(3, 11, "BANKING DETAILS",                  { bold: true, underline: true });

  // R4-9: address (E) + banking lines (K)
  jset(4, 5,  "ADDRESS",                          { bold: true, underline: true });
  jset(4, 11, `ACCOUNT NAME: ${JDM.accountName}`);
  jset(5, 5,  JDM.addr1);
  jset(5, 11, `BANK NAME: ${JDM.bankName}`);
  jset(6, 5,  JDM.addr2);
  jset(6, 11, `BRANCH ADDRESS: ${JDM.bankBranch1}`);
  jset(7, 5,  JDM.tel);
  jset(7, 11, JDM.bankBranch2);
  jset(8, 5,  JDM.email);
  jset(8, 11, `ACCOUNT # ${JDM.accountNo}`);
  jset(9, 11, `SWIFT CODE: ${JDM.swift}`);

  // R10: CONSIGNEE + NOTIFY PARTY
  jset(10, 1, "CONSIGNEE",    { bold: true, underline: true });
  jset(10, 6, "NOTIFY PARTY", { bold: true, underline: true });
  ws.getRow(10).height = 18;
  ws.getRow(11).height = 8;

  // R12: NAME + SAME AS CONSIGNEE + INVOICE (K12:O13 merged)
  ws.mergeCells(12, 2, 12, 4);
  jset(12, 1, "NAME :");
  jset(12, 2, inv.consignee.name,  { bold: true });
  jset(12, 6, "SAME AS CONSIGNEE");
  ws.mergeCells(12, 11, 13, 15);
  jset(12, 11, "INVOICE",           { bold: true, size: 18, h: "center" });
  ws.getRow(12).height = 15;

  // R13: ADDRESS
  ws.mergeCells(13, 2, 13, 4);
  jset(13, 1, "ADDRESS:");
  jset(13, 2, inv.consignee.address);
  ws.getRow(13).height = 15;

  // R14: empty
  ws.mergeCells(14, 2, 14, 4);
  ws.getRow(14).height = 15;

  // R15: PHONE + DATE
  ws.mergeCells(15, 2, 15, 4);
  jset(15, 1, "PHONE:");
  jset(15, 2, inv.consignee.phone);
  ws.mergeCells(15, 11, 15, 15);
  jset(15, 11, `DATE:${date}`, { bold: true, h: "center" });
  ws.getRow(15).height = 15;

  // R16: POD + INVOICE #
  ws.mergeCells(16, 2, 16, 4);
  jset(16, 1, "POD:");
  jset(16, 2, inv.consignee.port);
  ws.mergeCells(16, 11, 16, 15);
  jset(16, 11, `INVOICE # ${invNo}`, { bold: true, h: "center" });
  ws.getRow(16).height = 15;

  // R17: COUNTRY
  ws.mergeCells(17, 2, 17, 4);
  jset(17, 1, "COUNTRY :");
  jset(17, 2, inv.consignee.country);
  ws.getRow(17).height = 15;

  // R18: spacer
  ws.mergeCells(18, 1, 18, 4);
  ws.mergeCells(18, 6, 18, 9);
  ws.getRow(18).height = 8;

  // R19: table header
  ws.mergeCells(19, 2, 19, 3);   // MAKE
  ws.mergeCells(19, 5, 19, 6);   // CHASSIS
  ws.mergeCells(19, 7, 19, 8);   // YEAR
  ws.mergeCells(19, 9, 19, 10);  // COLOR
  ws.mergeCells(19, 11, 19, 12); // ENGINE SIZE
  jhdr(19, 1,  "No.");
  jhdr(19, 2,  "MAKE");
  jhdr(19, 4,  "MODEL");
  jhdr(19, 5,  "CHASSIS");
  jhdr(19, 7,  "YEAR");
  jhdr(19, 9,  "COLOR");
  jhdr(19, 11, "ENGINE SIZE");
  jhdr(19, 13, "QTY");
  jhdr(19, 14, "CNF$");
  jhdr(19, 15, "TOTAL AMOUNT $");
  ws.getRow(19).height = 18;

  function dataFmt(r) {
    ws.mergeCells(r, 2, r, 3);
    ws.mergeCells(r, 5, r, 6);
    ws.mergeCells(r, 7, r, 8);
    ws.mergeCells(r, 9, r, 10);
    ws.mergeCells(r, 11, r, 12);
    [1, 2, 4, 5, 7, 9, 11, 13, 14, 15].forEach(c => jbdr(r, c));
    ws.getRow(r).height = 18;
  }

  dataFmt(20);
  dataFmt(21);
  jset(21, 1,  "1",             { h: "center" });
  jset(21, 2,  make);
  jset(21, 4,  model);
  jset(21, 5,  inv.chassisNo);
  jset(21, 7,  inv.year ?? "");
  jset(21, 9,  inv.color);
  jset(21, 11, inv.engineNo ?? "");
  jset(21, 13, 1,               { h: "center" });
  jset(21, 14, inv.cnfPrice,    { numFmt: "#,##0" });
  jset(21, 15, inv.cnfPrice,    { numFmt: "#,##0" });
  for (let r = 22; r <= 28; r++) dataFmt(r);

  function totalRow(r, label, val) {
    ws.mergeCells(r, 2, r, 3);
    ws.mergeCells(r, 5, r, 6);
    ws.mergeCells(r, 7, r, 8);
    ws.mergeCells(r, 9, r, 10);
    ws.mergeCells(r, 11, r, 13);
    const lc = ws.getCell(r, 11);
    lc.value = label; lc.font = { bold: true, size: 10 };
    lc.alignment = { horizontal: "right", vertical: "middle" };
    xborder(lc);
    const uc = ws.getCell(r, 14);
    uc.value = "US$"; uc.font = { bold: true, size: 10 };
    uc.alignment = { horizontal: "center", vertical: "middle" };
    xborder(uc);
    const vc = ws.getCell(r, 15);
    vc.value = val; vc.font = { bold: true, size: 10 };
    vc.alignment = { horizontal: "right", vertical: "middle" };
    vc.numFmt = "#,##0"; xborder(vc);
    [1, 2, 4, 5, 7, 9].forEach(c => jbdr(r, c));
    ws.getRow(r).height = 16;
  }

  totalRow(29, `${advPct}% ADVANCE PAYMENT`, advAmt);
  totalRow(30, "BALANCE", remaining);

  // R31: Special Notes + TOTAL SALES PRICE
  ws.mergeCells(31, 1, 31, 10);
  const r31n = ws.getCell(31, 1);
  r31n.value = "Special Notes and Instructions";
  r31n.font  = { bold: true, size: 10 }; xborder(r31n);
  ws.mergeCells(31, 11, 31, 13);
  const r31l = ws.getCell(31, 11);
  r31l.value = "TOTAL SALES PRICE"; r31l.font = { bold: true, size: 10 };
  r31l.alignment = { horizontal: "right", vertical: "middle" }; xborder(r31l);
  const r31u = ws.getCell(31, 14);
  r31u.value = "US$"; r31u.font = { bold: true, size: 10 };
  r31u.alignment = { horizontal: "center", vertical: "middle" }; xborder(r31u);
  const r31v = ws.getCell(31, 15);
  r31v.value = inv.cnfPrice; r31v.font = { bold: true, size: 10 };
  r31v.alignment = { horizontal: "right", vertical: "middle" };
  r31v.numFmt = "#,##0"; xborder(r31v);
  ws.getRow(31).height = 16;

  // R32-39: Notes (A) + Intermediary banking (L=12)
  const notes = [
    ["Shipping:",                                                                                                    true],
    ["=>  After receiving deposit/payment original Bill of Lading will be released once full payment is received.", false],
    ["Conditions:",                                                                                                  true],
    ["=>  Please confirm import regulations with your local authority before purchase.",                              false],
    ["=>  Price stated in the invoice does not cover any bank charges.",                                              false],
    ["=>  Or additional charges payable to the bank.",                                                               false],
    ["=>  All bank charges must be paid by the customer.",                                                           false],
    ["=>  This is a computer generated invoice and requires no signature.",                                          false],
  ];
  const intBank = [
    ["",                           false],
    ["INTERMEDIARY BANKING DETAILS", true],
    [JDM.intBankName,              false],
    [JDM.intBranch,                false],
    [JDM.intAddr,                  false],
    [JDM.intCity,                  false],
    [JDM.intPost,                  false],
    [JDM.intSwift,                 false],
  ];
  notes.forEach(([text, bold], i) => {
    const r = 32 + i;
    const c = ws.getCell(r, 1);
    c.value = text; c.font = { bold, size: 10 };
    c.alignment = { vertical: "middle" };
    ws.getRow(r).height = 14;
  });
  intBank.forEach(([text, bold], i) => {
    const r = 32 + i;
    ws.mergeCells(r, 12, r, 15);
    const c = ws.getCell(r, 12);
    c.value = text; c.font = { bold, size: 10, underline: bold ? "single" : undefined };
    c.alignment = { horizontal: "left", vertical: "middle" };
  });

  // ── Section box borders ──────────────────────────────────────────────────
  const T = { style: "thin" };
  function addBdr(r, c, top, bot, lft, rgt) {
    const cell = ws.getCell(r, c);
    const cur = cell.border || {};
    cell.border = {
      top:    top ? T : cur.top,
      bottom: bot ? T : cur.bottom,
      left:   lft ? T : cur.left,
      right:  rgt ? T : cur.right,
    };
  }

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

  // DATE row: K(11)–O(15), row 15 — top + left + right
  for (let c = 11; c <= 15; c++) addBdr(15, c, true,  false, c===11, c===15);

  // INVOICE# row: K(11)–O(15), row 16 — bottom + left + right
  for (let c = 11; c <= 15; c++) addBdr(16, c, false, true,  c===11, c===15);

  // Intermediary banking box: L(12)–O(15), rows 33–39
  for (let c = 12; c <= 15; c++) addBdr(33, c, true,  false, c===12, c===15);
  for (let r = 34; r <= 38; r++) { addBdr(r, 12, false, false, true, false); addBdr(r, 15, false, false, false, true); }
  for (let c = 12; c <= 15; c++) addBdr(39, c, false, true,  c===12, c===15);

  const outPath = path.join(OUT, "test-jdm.xlsx");
  await wb.xlsx.writeFile(outPath);
  console.log("JDM Excel saved:", outPath);
}

// ─── Run ──────────────────────────────────────────────────────────────────────
await genSBK();
await genJDM();
console.log("\nBoth files saved to:", OUT);
