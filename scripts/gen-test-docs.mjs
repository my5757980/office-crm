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
  const paragraphs = def.lines.map(line =>
    new Paragraph({
      alignment: AlignmentType.LEFT,
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

function termPara(text) {
  return new Paragraph({
    alignment: AlignmentType.BOTH,
    spacing: { after: 0, before: 0 },
    children: [new TextRun({ text, size: 6 * 2, font: "Calibri" })],
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
            row(empty(6), { lines: [salesPerson, "Director International Sales"], bold: true, colSpan: 6 }),
          ],
        }),

        new Paragraph({ spacing: { after: 40 }, children: [] }),
        new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "Terms and Conditions:", font: "Calibri" })] }),
        ...TERMS.map(t => termPara(t)),
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
  bankBranch1: "1-203, TAKBATA, NAKAGAWA-KU,",
  bankBranch2: "NAGOYA-SHI, AICHI 454-0911, JAPAN",
  bankName:    "MITSUBISHI UFJ",
  accountNo:   "0282462",
  swift:       "BOTKJPJT",
  accountName: "JDM TRADING CO. LTD",
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
  const date    = inv.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const invNo   = `JDM-${inv._id.slice(-5).toUpperCase()}`;
  const advPct  = inv.advancePercent ?? 50;
  const advAmt  = Math.round(inv.cnfPrice * advPct / 100);
  const remaining = inv.cnfPrice - advAmt;

  const unitParts = inv.unit.split(" ");
  const make  = unitParts[0] ?? inv.unit;
  const model = unitParts.slice(1).join(" ") || inv.unit;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("INVOICE");

  ws.columns = [
    { width: 2.2 },  { width: 12.4 }, { width: 5.1 },  { width: 12.4 },
    { width: 14.1 }, { width: 0.9 },  { width: 6.4 },  { width: 6.4 },
    { width: 7.1 },  { width: 5.5 },  { width: 6.9 },  { width: 8.1 },
    { width: 6.6 },  { width: 9.6 },  { width: 9.5 },  { width: 5.4 },
    { width: 12.1 }, { width: 16.1 }, { width: 20.8 },
  ];

  ws.getRow(1).height = 10;
  ws.getRow(2).height = 10;

  ws.mergeCells(3, 1, 3, 19);
  const r3 = ws.getCell(3, 1);
  r3.value = JDM.name;
  r3.font = { bold: true, size: 14, color: { argb: "FF8B0000" } };
  r3.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(3).height = 25;

  ws.mergeCells(4, 2, 4, 7);
  xlbl(ws, 4, 2, "          ADDRESS:", 8);
  ws.mergeCells(4, 17, 4, 19);
  const r4bank = ws.getCell(4, 17);
  r4bank.value = "BANKING DETAILS:";
  r4bank.font = { bold: true, size: 9 };
  ws.getRow(4).height = 15;

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
    ws.mergeCells(r, 17, r, 19);
    xlbl(ws, r, 17, val, 9);
    ws.getRow(r).height = 15;
  });

  ws.mergeCells(7, 1, 7, 14);

  xlbl(ws, 10, 2, "CONSIGNEE:", 9);
  ws.getCell(10, 2).font = { bold: true, size: 9 };
  xlbl(ws, 10, 8, "NOTIFY PARTY:", 9);
  ws.getCell(10, 8).font = { bold: true, size: 9 };
  ws.getRow(10).height = 18;
  ws.getRow(11).height = 8;

  xlbl(ws, 12, 2, "NAME :", 9);
  ws.mergeCells(12, 3, 12, 5);
  const r12name = ws.getCell(12, 3);
  r12name.value = inv.consignee.name;
  r12name.font = { bold: true, size: 9 };
  ws.mergeCells(12, 8, 12, 9);
  xlbl(ws, 12, 8, "NAME:", 9);
  ws.mergeCells(12, 10, 12, 14);
  xlbl(ws, 12, 10, "SAME", 9);
  ws.mergeCells(12, 19, 12, 19);
  const r12date = ws.getCell(12, 19);
  r12date.value = `DATE: ${date}`;
  r12date.font = { bold: true, size: 9 };
  ws.getRow(12).height = 15;

  xlbl(ws, 13, 2, "ADDRESS:", 9);
  ws.mergeCells(13, 3, 13, 5);
  xlbl(ws, 13, 3, inv.consignee.address, 9);
  ws.mergeCells(13, 8, 13, 9);
  xlbl(ws, 13, 8, "Address :", 9);
  ws.mergeCells(13, 10, 13, 14);
  xlbl(ws, 13, 10, "SAME", 9);
  ws.mergeCells(13, 19, 13, 19);
  const r13inv = ws.getCell(13, 19);
  r13inv.value = `INVOICE # ${invNo}`;
  r13inv.font = { bold: true, size: 9 };
  ws.getRow(13).height = 15;

  ws.mergeCells(14, 3, 14, 5);
  ws.mergeCells(14, 8, 14, 9);
  ws.mergeCells(14, 10, 14, 14);
  ws.getRow(14).height = 15;

  xlbl(ws, 15, 2, "PHONE:", 9);
  ws.mergeCells(15, 3, 15, 5);
  xlbl(ws, 15, 3, inv.consignee.phone, 9);
  ws.mergeCells(15, 8, 15, 9);
  xlbl(ws, 15, 8, "Country :", 9);
  ws.mergeCells(15, 10, 15, 14);
  xlbl(ws, 15, 10, inv.consignee.country, 9);
  ws.getRow(15).height = 15;

  xlbl(ws, 16, 2, "POD:", 9);
  ws.mergeCells(16, 3, 16, 5);
  xlbl(ws, 16, 3, inv.consignee.port, 9);
  ws.mergeCells(16, 8, 16, 9);
  ws.mergeCells(16, 10, 16, 14);
  ws.getRow(16).height = 15;

  xlbl(ws, 17, 2, "COUNTRY :", 9);
  ws.mergeCells(17, 3, 17, 5);
  xlbl(ws, 17, 3, inv.consignee.country, 9);
  ws.getRow(17).height = 15;

  ws.mergeCells(18, 2, 18, 5);
  ws.mergeCells(18, 8, 18, 13);
  ws.getRow(18).height = 8;

  ws.mergeCells(19, 3, 19, 4);
  ws.mergeCells(19, 5, 19, 6);
  ws.mergeCells(19, 7, 19, 9);
  ws.mergeCells(19, 10, 19, 12);
  ws.mergeCells(19, 13, 19, 14);
  ws.mergeCells(19, 15, 19, 16);
  xhdr(ws, 19, 2,  "No.");
  xhdr(ws, 19, 3,  "MAKE");
  xhdr(ws, 19, 5,  "MODEL");
  xhdr(ws, 19, 7,  "CHASSIS");
  xhdr(ws, 19, 10, "YEAR");
  xhdr(ws, 19, 13, "COLOR");
  xhdr(ws, 19, 15, "ENGINE SIZE");
  xhdr(ws, 19, 17, "QTY");
  xhdr(ws, 19, 18, "CNF$");
  xhdr(ws, 19, 19, "TOTAL AMOUNT $");
  ws.getRow(19).height = 18;

  function applyDataRowFormat(r) {
    ws.mergeCells(r, 3, r, 4);
    ws.mergeCells(r, 5, r, 6);
    ws.mergeCells(r, 7, r, 9);
    ws.mergeCells(r, 10, r, 12);
    ws.mergeCells(r, 13, r, 14);
    ws.mergeCells(r, 15, r, 16);
    [2, 3, 5, 7, 10, 13, 15, 17, 18, 19].forEach(c => xborder(ws.getCell(r, c)));
    ws.getRow(r).height = 18;
  }

  applyDataRowFormat(20);
  applyDataRowFormat(21);
  xdat(ws, 21, 2,  "1",          { bold: true, align: "center" });
  xdat(ws, 21, 3,  make);
  xdat(ws, 21, 5,  model);
  xdat(ws, 21, 7,  inv.chassisNo);
  xdat(ws, 21, 10, inv.year ?? "");
  xdat(ws, 21, 13, inv.color);
  xdat(ws, 21, 15, inv.engineNo ?? "");
  xdat(ws, 21, 17, 1,            { align: "center" });
  xdat(ws, 21, 18, inv.cnfPrice, { numFmt: "#,##0" });
  xdat(ws, 21, 19, inv.cnfPrice, { numFmt: "#,##0" });

  for (let r = 22; r <= 31; r++) applyDataRowFormat(r);

  function totalRow(r, label, val) {
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
    xborder(lc);
    const uc = ws.getCell(r, 18);
    uc.value = "US$";
    uc.font = { bold: true, size: 9 };
    uc.alignment = { horizontal: "center", vertical: "middle" };
    xborder(uc);
    const vc = ws.getCell(r, 19);
    vc.value = val;
    vc.font = { bold: true, size: 9 };
    vc.alignment = { horizontal: "right", vertical: "middle" };
    vc.numFmt = "#,##0";
    xborder(vc);
    [3, 5, 7, 10, 13].forEach(c => xborder(ws.getCell(r, c)));
    ws.getRow(r).height = 16;
  }

  totalRow(32, `${advPct}% ADVANCE PAYMENT`, advAmt);
  totalRow(33, "BALANCE",                    remaining);

  ws.mergeCells(34, 2, 34, 14);
  const r34note = ws.getCell(34, 2);
  r34note.value = "Special Notes and Instructions";
  r34note.font = { bold: true, size: 9 };
  xborder(r34note);
  ws.mergeCells(34, 15, 34, 17);
  const r34lbl = ws.getCell(34, 15);
  r34lbl.value = "TOTAL SALES PRICE";
  r34lbl.font = { bold: true, size: 9 };
  r34lbl.alignment = { horizontal: "right", vertical: "middle" };
  xborder(r34lbl);
  const r34us = ws.getCell(34, 18);
  r34us.value = "US$";
  r34us.font = { bold: true, size: 9 };
  r34us.alignment = { horizontal: "center", vertical: "middle" };
  xborder(r34us);
  const r34val = ws.getCell(34, 19);
  r34val.value = inv.cnfPrice;
  r34val.font = { bold: true, size: 9 };
  r34val.alignment = { horizontal: "right", vertical: "middle" };
  r34val.numFmt = "#,##0";
  xborder(r34val);
  ws.getRow(34).height = 16;

  const notes = [
    [35, "Shipping:",                                                                                                   true],
    [36, "=>  After receiving deposit/payment original Bill of Lading will be released once full payment is received.", false],
    [37, "Conditions:",                                                                                                 true],
    [38, "=>  Please confirm import regulations with your local authority before purchase.",                             false],
    [39, "=>  Price stated in the invoice does not cover any bank charges.",                                            false],
    [40, "=>  Or additional charges payable to the bank.",                                                              false],
    [41, "=>  All bank charges must be paid by the customer.",                                                          false],
    [42, "=>  This is a computer generated invoice and requires no signature.",                                         false],
  ];
  notes.forEach(([r, text, bold]) => {
    ws.mergeCells(r, 2, r, 19);
    const c = ws.getCell(r, 2);
    c.value = text;
    c.font = { bold, size: 8 };
    c.alignment = { vertical: "middle" };
    ws.getRow(r).height = 14;
  });

  const outPath = path.join(OUT, "test-jdm.xlsx");
  await wb.xlsx.writeFile(outPath);
  console.log("JDM Excel saved:", outPath);
}

// ─── Run ──────────────────────────────────────────────────────────────────────
await genSBK();
await genJDM();
console.log("\nBoth files saved to:", OUT);
