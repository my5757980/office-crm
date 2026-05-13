import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
  AlignmentType, WidthType, BorderStyle, HeadingLevel,
} from "docx";

const CAN_DOWNLOAD = ["super_admin"];

const SBK = {
  name: "SBK GLOBAL AUTO TRADING FZC LLC",
  addr1: "Amber Gem Tower, Mezzanine Floor, Sheikh Khalifa Street,",
  addr2: "P.O Box 4848, Ajman, United Arab Emirates",
  web: "www.sbkautotrading.com",
  email: "payment@sbkautotrading.com",
  phone: "+971 55 417 7311 (UAE)  |  +81 3 5050 0251 (Japan)  |  WhatsApp: +66 991983485 (Thailand)",
  bankName: "Emirates Islamic",
  bankBranch: "EI Ibn Batuta Mall, Dubai, United Arab Emirates",
  iban: "AE020340003708512932302",
  accountNo: "3708512932302",
  swift: "MEBLAEADXXX",
  accountName: "SBK GLOBAL AUTO TRADING FZC LLC",
};

const TERMS = [
  "All Customer payments shall be made through Telegraphic Transfer (TT), as according to the Country's prevailing Regulations.",
  "Customer shall state the Proforma Invoice No. as reference for payment in the information area of the TT/SWIFT/LC application.",
  "The proof of payment shall be emailed by the Customer to SBK Global Auto Trading which would be verified and receipted on realization of funds.",
  "If the Deposit/Payment is not paid or LC not opened within the given Reservation Period of seven (07) working days, the Exporter reserves the right to sell the vehicle to another customer.",
  "The Issuing & Correspondence Bank charges shall be paid by the Customer.",
  "The estimated shipment date would take place within three (03) weeks, after confirmation of satisfactory receipt of Customer Payment.",
  "Any amendment request for BL, after shipment instruction, shall incur USD 50 on each such adjustment, charged to the customer.",
  "Customer need to ensure balance payment within 1 week of the issuance of Bill of Lading.",
  "Customer should settle timeously, and shall not hold SBK Global Auto Trading responsible for any delay arising from payment delays.",
  "Should there be any delay of payment, additional Yard Fees would be charged to the Customer at USD 3/per day.",
];

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function amountToWords(n: number): string {
  const amount = Math.round(n);
  if (amount === 0) return "ZERO";
  const ones = ["","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE",
    "TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN"];
  const tens = ["","","TWENTY","THIRTY","FORTY","FIFTY","SIXTY","SEVENTY","EIGHTY","NINETY"];
  function convert(num: number): string {
    if (num === 0) return "";
    if (num < 20) return ones[num] + " ";
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "") + " ";
    if (num < 1000) return ones[Math.floor(num / 100)] + " HUNDRED " + convert(num % 100);
    return convert(Math.floor(num / 1000)) + "THOUSAND " + convert(num % 1000);
  }
  return convert(amount).trim();
}

function cell(text: string, opts: { bold?: boolean; center?: boolean; shade?: boolean; size?: number } = {}) {
  return new TableCell({
    shading: opts.shade ? { fill: "1a1a2e", type: "clear" } : undefined,
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({
        text,
        bold: opts.bold ?? false,
        color: opts.shade ? "FFFFFF" : "000000",
        size: (opts.size ?? 9) * 2,
        font: "Calibri",
      })],
    })],
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}

function para(text: string, opts: { bold?: boolean; center?: boolean; size?: number; color?: string; spacing?: number } = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { after: opts.spacing ?? 60 },
    children: [new TextRun({
      text,
      bold: opts.bold ?? false,
      size: (opts.size ?? 10) * 2,
      color: opts.color ?? "000000",
      font: "Calibri",
    })],
  });
}

function thinBorder() {
  return { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" };
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

  const date = new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const invNo = `SBK-${String(id).slice(-5).toUpperCase()}`;
  const docNo = `SBK-${new Date(inv.createdAt).getFullYear().toString().slice(2)}-${String(id).slice(-4).toUpperCase()}`;
  const half = inv.cnfPrice / 2;

  const borderSet = {
    top: thinBorder(), bottom: thinBorder(),
    left: thinBorder(), right: thinBorder(),
    insideH: thinBorder(), insideV: thinBorder(),
  };

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 720, bottom: 720, left: 900, right: 900 },
        },
      },
      children: [
        // ── Company Header ─────────────────────────────
        para(SBK.name,  { bold: true, center: true, size: 14, spacing: 30 }),
        para(SBK.addr1, { center: true, size: 8, spacing: 20 }),
        para(SBK.addr2, { center: true, size: 8, spacing: 20 }),
        para(SBK.web,   { center: true, size: 8, spacing: 20 }),
        para(SBK.email, { center: true, size: 8, spacing: 20 }),
        para(SBK.phone, { center: true, size: 8, spacing: 60 }),

        // ── INVOICE Title ──────────────────────────────
        para("I N V O I C E", { bold: true, center: true, size: 16, color: "8B0000", spacing: 80 }),

        // ── Consignee + Document Details table ─────────
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: borderSet,
          rows: [
            new TableRow({ children: [
              cell("CONSIGNEE :", { bold: true }),
              cell(""),
              cell("DATE", { bold: true }),
              cell(`: ${date}`),
            ]}),
            new TableRow({ children: [
              cell("Name"),
              cell(inv.consignee.name),
              cell("DOCUMENT NO", { bold: true }),
              cell(`: ${docNo}`),
            ]}),
            new TableRow({ children: [
              cell("Address"),
              cell(inv.consignee.address),
              cell("INVOICE", { bold: true }),
              cell(`: ${invNo}`),
            ]}),
            new TableRow({ children: [
              cell("Port"),
              cell(inv.consignee.port),
              cell("PORT OF LOADING", { bold: true }),
              cell(": ANY JAPANESE PORT"),
            ]}),
            new TableRow({ children: [
              cell("Country"),
              cell(inv.consignee.country),
              cell("SHIPMENT TYPE", { bold: true }),
              cell(": RORO"),
            ]}),
            new TableRow({ children: [
              cell("Phone"),
              cell(inv.consignee.phone),
              cell("INCOTERM", { bold: true }),
              cell(": C&F"),
            ]}),
            new TableRow({ children: [
              cell(""),
              cell(""),
              cell("PAYMENT TERMS", { bold: true }),
              cell(": 50% Advance Payment"),
            ]}),
            new TableRow({ children: [
              cell(""),
              cell(""),
              cell("CURRENCY", { bold: true }),
              cell(": US$"),
            ]}),
          ],
        }),

        new Paragraph({ spacing: { after: 80 }, children: [] }),

        // ── Vehicle Table ───────────────────────────────
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: borderSet,
          rows: [
            // Header
            new TableRow({ children: [
              cell("S.No", { bold: true, center: true, shade: true }),
              cell("Chassis No.", { bold: true, center: true, shade: true }),
              cell("Origin", { bold: true, center: true, shade: true }),
              cell("Description & Details", { bold: true, center: true, shade: true }),
              cell("Color", { bold: true, center: true, shade: true }),
              cell("Engine No.", { bold: true, center: true, shade: true }),
              cell("Qty", { bold: true, center: true, shade: true }),
              cell("C&F US$", { bold: true, center: true, shade: true }),
              cell("Total US$", { bold: true, center: true, shade: true }),
            ]}),
            // Data row
            new TableRow({ children: [
              cell("1", { center: true }),
              cell(inv.chassisNo),
              cell("Japan"),
              cell(inv.unit),
              cell(inv.color),
              cell(inv.engineNo),
              cell("1", { center: true }),
              cell(fmt(inv.cnfPrice), { center: true }),
              cell(fmt(inv.cnfPrice), { center: true }),
            ]}),
          ],
        }),

        new Paragraph({ spacing: { after: 80 }, children: [] }),

        // ── Totals ──────────────────────────────────────
        new Table({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: borderSet,
          float: { horizontalAnchor: "text", absoluteHorizontalPosition: 0 },
          rows: [
            new TableRow({ children: [
              cell("Total Amount",    { bold: true }),
              cell(fmt(inv.cnfPrice), { bold: true }),
            ]}),
            new TableRow({ children: [
              cell("50% Advance Payment"),
              cell(fmt(half)),
            ]}),
            new TableRow({ children: [
              cell("Remaining Balance"),
              cell(fmt(half)),
            ]}),
          ],
        }),

        new Paragraph({ spacing: { after: 60 }, children: [] }),
        para(`TOTAL AMOUNT IN WORDS: ${amountToWords(inv.cnfPrice)} US DOLLARS ONLY`, { bold: true, size: 9, spacing: 100 }),

        // ── Bank Details ────────────────────────────────
        para("SHIPPER'S BANK DETAILS:", { bold: true, size: 10, spacing: 40 }),
        new Table({
          width: { size: 80, type: WidthType.PERCENTAGE },
          borders: borderSet,
          rows: [
            new TableRow({ children: [cell("ACCOUNT NAME:", { bold: true }), cell(SBK.accountName)] }),
            new TableRow({ children: [cell("BANK:", { bold: true }),          cell(SBK.bankName)] }),
            new TableRow({ children: [cell("BRANCH ADDRESS:", { bold: true }),cell(SBK.bankBranch)] }),
            new TableRow({ children: [cell("IBAN:", { bold: true }),           cell(SBK.iban)] }),
            new TableRow({ children: [cell("ACCOUNT NO:", { bold: true }),    cell(SBK.accountNo)] }),
            new TableRow({ children: [cell("SWIFT CODE:", { bold: true }),    cell(SBK.swift)] }),
          ],
        }),

        new Paragraph({ spacing: { after: 100 }, children: [] }),

        // ── Terms ───────────────────────────────────────
        para("Terms and Conditions:", { bold: true, size: 9, spacing: 40 }),
        ...TERMS.map((t, i) => para(`${i + 1}. ${t}`, { size: 7, spacing: 30 })),
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
