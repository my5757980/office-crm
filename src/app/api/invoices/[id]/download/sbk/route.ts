import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
  AlignmentType, WidthType, BorderStyle, VerticalMergeType,
} from "docx";

const CAN_DOWNLOAD = ["super_admin"];

// Column widths in twips matching original template
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

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const THIN = { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" };
const ALL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN };

type CellDef = {
  lines: string[];
  bold?: boolean;
  size?: number;
  shade?: string;
  colSpan?: number;
  vMerge?: "restart" | "continue";
};

function makeCell(def: CellDef): TableCell {
  const sz = (def.size ?? 7) * 2;
  const paragraphs = def.lines.map(line =>
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: line, bold: def.bold ?? false, size: sz, font: "Calibri" })],
    })
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: any = {
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

function row(...cells: CellDef[]): TableRow {
  return new TableRow({ children: cells.map(makeCell) });
}

function empty(colSpan = 1): CellDef {
  return { lines: [""], colSpan };
}

function hdrPara(text: string, opts: { size?: number; color?: string; bold?: boolean; after?: number } = {}) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: opts.after ?? 20, before: 0 },
    children: [new TextRun({
      text,
      bold: opts.bold ?? true,
      size: (opts.size ?? 8) * 2,
      color: opts.color ?? "000000",
      font: "Calibri",
    })],
  });
}

function termPara(text: string) {
  return new Paragraph({
    alignment: AlignmentType.BOTH,
    spacing: { after: 0, before: 0 },
    children: [new TextRun({ text, size: 6 * 2, font: "Calibri" })],
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !CAN_DOWNLOAD.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const { id } = await params;

  const inv = await Invoice.findById(id).lean();
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const date   = new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  // DOCUMENT NO: SBK + zero-padded sequential part
  const docNo  = `K-${new Date(inv.createdAt).getFullYear().toString().slice(2)}-${String(id).slice(-5).toUpperCase()}`;
  const invNo  = `SBK${String(id).slice(-5).toUpperCase()}`;
  const half   = inv.cnfPrice / 2;
  const words  = amountToWords(inv.cnfPrice);

  const vehicleYearLine = inv.year ? inv.year : "—";
  const engineLine      = inv.engineNo || "—";

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 600, bottom: 600, left: 720, right: 720 } },
      },
      children: [
        // ── Header paragraphs ────────────────────────────────────────────────
        hdrPara("SBK Global Auto Trading FZC LLC", { size: 16, color: "1F497D", after: 20 }),
        hdrPara(SBK_INFO.addr1, { size: 8, color: "C00000", after: 20 }),
        hdrPara(SBK_INFO.addr2, { size: 8, color: "C00000", after: 20 }),
        hdrPara(SBK_INFO.web,   { size: 8, color: "C00000", after: 20 }),
        hdrPara(SBK_INFO.email, { size: 8, color: "C00000", after: 20 }),
        hdrPara(SBK_INFO.phone, { size: 8, color: "C00000", after: 60 }),

        // ── 28-row table ─────────────────────────────────────────────────────
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: COLS,
          // ── R0: CONSIGNEE header | DATE | HAULER
          rows: [
            row(
              { lines: ["CONSIGNEE :"], bold: true, colSpan: 6 },
              { lines: ["DATE"] },
              { lines: [`: ${date}`], colSpan: 2 },
              { lines: ["HAULER\t: TBA"], colSpan: 3 },
            ),
            // R1: Name | DOCUMENT NO | VESSEL
            row(
              { lines: ["Name"], colSpan: 2 },
              { lines: [inv.consignee.name], colSpan: 4 },
              { lines: ["DOCUMENT NO"] },
              { lines: [`: ${docNo}`], colSpan: 2 },
              { lines: ["VESSEL\t: TBA"], colSpan: 3 },
            ),
            // R2: Address | INVOICE | PORT OF LOADING
            row(
              { lines: ["Address"], colSpan: 2 },
              { lines: [inv.consignee.address], colSpan: 4 },
              { lines: ["INVOICE"] },
              { lines: [`: ${invNo}`], colSpan: 2 },
              { lines: ["PORT OF LOADING\t: ANY"], colSpan: 3 },
            ),
            // R3: Port | SALES PERSON | PORT OF UNLOADING
            row(
              { lines: ["Port"], colSpan: 2 },
              { lines: [inv.consignee.port], colSpan: 4 },
              { lines: ["SALES PERSON"] },
              { lines: [": TBA"], colSpan: 2 },
              { lines: [`PORT OF UNLOADING\t: ${inv.consignee.port}`], colSpan: 3 },
            ),
            // R4: Country | SHIPMENT TYPE | ETD
            row(
              { lines: ["Country"], colSpan: 2 },
              { lines: [inv.consignee.country], colSpan: 4 },
              { lines: ["SHIPMENT TYPE"] },
              { lines: [": RORO"], colSpan: 2 },
              { lines: ["ETD\t: TBA"], colSpan: 3 },
            ),
            // R5: Phone | INCOTERM | COUNTRY
            row(
              { lines: ["Phone"], colSpan: 2 },
              { lines: [inv.consignee.phone], colSpan: 4 },
              { lines: ["INCOTERM"] },
              { lines: [": C&F"], colSpan: 2 },
              { lines: [`COUNTRY\t: ${inv.consignee.country}`], colSpan: 3 },
            ),
            // R6: Email | empty | empty | empty
            row(
              { lines: ["Email"], colSpan: 2 },
              { lines: ["—"], colSpan: 4 },
              { lines: [""], colSpan: 1 },
              { lines: [""], colSpan: 2 },
              { lines: [""], colSpan: 3 },
            ),
            // R7: NOTIFY PARTY | empty | empty | empty
            row(
              { lines: ["NOTIFY PARTY :"], bold: true, colSpan: 6 },
              { lines: [""], colSpan: 1 },
              { lines: [""], colSpan: 2 },
              { lines: [""], colSpan: 3 },
            ),
            // R8: Same as consignee | empty(C6-C8) | empty(C9-C11)
            row(
              { lines: ["Same as consignee"], bold: true, colSpan: 6 },
              { lines: [""], colSpan: 3 },
              { lines: [""], colSpan: 3 },
            ),
            // R9: Same as consignee | empty(C6-C8) | PAYMENT TERMS (shaded)
            row(
              { lines: ["Same as consignee"], bold: true, colSpan: 6 },
              { lines: [""], colSpan: 3 },
              { lines: ["PAYMENT TERMS\t: 50% (Advance Payment)"], bold: true, colSpan: 3, shade: "BFBFBF" },
            ),
            // R10: Same as consignee | empty(C6-C8) | CURRENCY
            row(
              { lines: ["Same as consignee"], bold: true, colSpan: 6 },
              { lines: [""], colSpan: 3 },
              { lines: ["CURRENCY\t: US$"], bold: true, colSpan: 3 },
            ),
            // R11: Vehicle header (shaded gray)
            row(
              { lines: ["S.No"], bold: true, shade: "BFBFBF" },
              { lines: ["Chassis No. (STOCK ID)", "ORIGIN"], bold: true, shade: "BFBFBF", colSpan: 3 },
              { lines: ["DESCRIPTION & DETAILS"], bold: true, shade: "BFBFBF", colSpan: 2 },
              { lines: ["YEAR MONTH & ENGINE CC"], bold: true, shade: "BFBFBF" },
              { lines: ["TRANS & FUEL"], bold: true, shade: "BFBFBF", colSpan: 2 },
              { lines: ["QTY"], bold: true, shade: "BFBFBF" },
              { lines: ["C&F US$"], bold: true, shade: "BFBFBF" },
              { lines: ["TOTAL US$"], bold: true, shade: "BFBFBF" },
            ),
            // R12: VEHICLE(S)
            row({ lines: ["VEHICLE(S)"], bold: true, colSpan: 12 }),
            // R13: Data row
            row(
              { lines: ["1"] },
              { lines: [inv.chassisNo, "ORIGIN: JAPAN"], colSpan: 3 },
              { lines: [""] },
              { lines: [inv.unit] },
              { lines: [vehicleYearLine, engineLine] },
              { lines: ["TBA", "TBA"], colSpan: 2 },
              { lines: ["1"] },
              { lines: [fmt(inv.cnfPrice)] },
              { lines: [fmt(inv.cnfPrice)] },
            ),
            // R14: Total Amount
            row(
              empty(),
              empty(3),
              empty(4),
              { lines: ["Total Amount"], bold: true, colSpan: 3 },
              { lines: [fmt(inv.cnfPrice)], bold: true },
            ),
            // R15: 50% Amount
            row(
              empty(),
              empty(3),
              empty(4),
              { lines: ["50% Amount"], bold: true, colSpan: 3 },
              { lines: [fmt(half)], bold: true },
            ),
            // R16: Remaining Balance (shaded)
            row(
              empty(),
              empty(3),
              empty(4),
              { lines: ["Remaining Balance"], bold: true, colSpan: 3, shade: "BFBFBF" },
              { lines: [fmt(half)], bold: true, shade: "BFBFBF" },
            ),
            // R17: TOTAL AMOUNT VALUE IN WORDS
            row(
              { lines: [`TOTAL AMOUNT VALUE IN WORDS : ${words} US DOLLARS ONLY`], bold: true, colSpan: 9 },
              empty(3),
            ),
            // R18: PERFORMA INVOICE
            row(
              { lines: [`PERFORMA INVOICE : ${invNo}`], bold: true, colSpan: 9 },
              empty(3),
            ),
            // R19: BANK DETAILS header | REMARKS (vMerge restart — spans R19-R24)
            row(
              { lines: ["", "SHIPPER'S BANK DETAILS:"], bold: true, colSpan: 8 },
              { lines: SBK_INFO.remarks.split("\n"), bold: false, colSpan: 4, vMerge: "restart" },
            ),
            // R20: ACCOUNT | VALUE | empty(C6-C7) | vMerge continue
            row(
              { lines: ["ACCOUNT:"], bold: true, colSpan: 3 },
              { lines: [SBK_INFO.bankAccount], bold: true, colSpan: 3 },
              empty(2),
              { lines: [""], colSpan: 4, vMerge: "continue" },
            ),
            // R21: BANK
            row(
              { lines: ["BANK:"], bold: true, colSpan: 3 },
              { lines: [SBK_INFO.bankName], bold: true, colSpan: 3 },
              empty(2),
              { lines: [""], colSpan: 4, vMerge: "continue" },
            ),
            // R22: BRANCH
            row(
              { lines: ["BRANCH:"], bold: true, colSpan: 3 },
              { lines: [SBK_INFO.bankBranch], bold: true, colSpan: 3 },
              empty(2),
              { lines: [""], colSpan: 4, vMerge: "continue" },
            ),
            // R23: ADDRESS
            row(
              { lines: ["ADDRESS:"], bold: true, colSpan: 3 },
              { lines: [SBK_INFO.bankAddress], bold: true, colSpan: 3 },
              empty(2),
              { lines: [""], colSpan: 4, vMerge: "continue" },
            ),
            // R24: IBAN
            row(
              { lines: ["IBAN:"], bold: true, colSpan: 3 },
              { lines: [SBK_INFO.iban], bold: true, colSpan: 3 },
              empty(2),
              { lines: [""], colSpan: 4, vMerge: "continue" },
            ),
            // R25: ACCOUNT NO (no vMerge — REMARKS ends at R24)
            row(
              { lines: ["ACCOUNT NO:"], bold: true, colSpan: 3 },
              { lines: [SBK_INFO.accountNo], bold: true, colSpan: 3 },
              empty(2),
              empty(4),
            ),
            // R26: SWIFT CODE
            row(
              { lines: ["SWIFT CODE:"], bold: true, colSpan: 3 },
              { lines: [SBK_INFO.swift], bold: true, colSpan: 3 },
              empty(2),
              empty(4),
            ),
            // R27: Signature
            row({
              lines: ["SM Khurram Rashid", "Director International Sales"],
              colSpan: 12,
              size: 9,
            }),
          ],
        }),

        // ── Terms ─────────────────────────────────────────────────────────────
        new Paragraph({ children: [] }),
        new Paragraph({
          spacing: { after: 0 },
          children: [new TextRun({ text: "Terms and Conditions:", font: "Calibri" })],
        }),
        ...TERMS.map(t => termPara(t)),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="SBK-Invoice-${invNo}.docx"`,
    },
  });
}
