import React from "react";
import {
  Document, Page, View, Text, Image, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";
import fs from "fs";
import path from "path";

// ── types ─────────────────────────────────────────────────────────────────────
interface ConsigneeData {
  name: string; address: string; phone: string; country: string; port: string;
}
export interface SBKInvData {
  _id: unknown;
  consignee: ConsigneeData;
  unit: string;
  year?: string;
  chassisNo: string;
  engineNo?: string;
  color: string;
  cnfPrice: number;
  advancePercent?: number;
  salesperson?: string;
  fuel?: string;
  transmission?: string;
  createdAt: Date | string;
}

// ── column widths (pt) — 12 cols summing to 523 ───────────────────────────────
const C = [19, 14, 25, 30, 3, 129, 61, 47, 30, 64, 52, 49];
function cw(start: number, span = 1) {
  return C.slice(start, start + span).reduce((a, b) => a + b, 0);
}

// ── static data ───────────────────────────────────────────────────────────────
const SBK = {
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

// ── helpers ───────────────────────────────────────────────────────────────────
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

// ── styles ────────────────────────────────────────────────────────────────────
const H = 14; // default cell min-height

const s = StyleSheet.create({
  page: {
    paddingTop: 28, paddingBottom: 28,
    paddingLeft: 36, paddingRight: 36,
    fontSize: 7, fontFamily: "Helvetica",
  },
  row:    { flexDirection: "row" },
  cell:   {
    borderWidth: 0.5, borderColor: "#AAAAAA",
    paddingHorizontal: 2, paddingVertical: 1,
  },
  bold:   { fontFamily: "Helvetica-Bold" },
  shaded: { backgroundColor: "#BFBFBF" },
  hdr1:   { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#1F497D", marginBottom: 2 },
  hdr2:   { fontSize: 7.5, color: "#C00000", marginBottom: 1 },
  term:   { fontSize: 5.5, marginBottom: 1 },
});

// ── Cell component ────────────────────────────────────────────────────────────
function Cell({ w, h = H, bold = false, shaded = false, children }: {
  w: number; h?: number; bold?: boolean; shaded?: boolean; children?: string;
}) {
  return (
    <View style={[s.cell, { width: w, minHeight: h }, shaded ? s.shaded : {}]}>
      <Text style={bold ? s.bold : {}}>{children ?? ""}</Text>
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={s.row}>{children}</View>;
}

// ── Document component ────────────────────────────────────────────────────────
function SBKDocument({ inv, logoUrl, stampUrl }: {
  inv: SBKInvData; logoUrl: string; stampUrl: string;
}) {
  const date   = new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const id     = String(inv._id);
  const docNo  = `K-${new Date(inv.createdAt).getFullYear().toString().slice(2)}-${id.slice(-5).toUpperCase()}`;
  const invNo  = `SBK${id.slice(-5).toUpperCase()}`;
  const advPct     = inv.advancePercent ?? 50;
  const advanceAmt = Math.round(inv.cnfPrice * advPct / 100);
  const remaining  = inv.cnfPrice - advanceAmt;
  const words      = amountToWords(inv.cnfPrice);
  const salesPerson  = inv.salesperson  || "TBA";
  const transmission = inv.transmission || "TBA";
  const fuel         = inv.fuel         || "TBA";
  const year         = inv.year         || "—";
  const engine       = inv.engineNo     || "—";
  const con          = inv.consignee;

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header — logo left, company info right */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 5 }}>
          <Image src={logoUrl} style={{ width: 180, height: 63, marginRight: 16, flexShrink: 0 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.hdr1}>SBK Global Auto Trading FZC LLC</Text>
            <Text style={s.hdr2}>{SBK.addr1}</Text>
            <Text style={s.hdr2}>{SBK.addr2}</Text>
            <Text style={s.hdr2}>{SBK.web}</Text>
            <Text style={s.hdr2}>{SBK.email}</Text>
            <Text style={s.hdr2}>{SBK.phone}</Text>
          </View>
        </View>

        {/* R0: CONSIGNEE | DATE | HAULER */}
        <Row>
          <Cell w={cw(0,6)} bold>CONSIGNEE :</Cell>
          <Cell w={cw(6,1)} bold>DATE</Cell>
          <Cell w={cw(7,2)}>{`: ${date}`}</Cell>
          <Cell w={cw(9,3)}>{"HAULER    : TBA"}</Cell>
        </Row>

        {/* R1: Name | DOCUMENT NO | VESSEL */}
        <Row>
          <Cell w={cw(0,2)}>Name</Cell>
          <Cell w={cw(2,4)}>{con.name}</Cell>
          <Cell w={cw(6,1)} bold>DOCUMENT NO</Cell>
          <Cell w={cw(7,2)}>{`: ${docNo}`}</Cell>
          <Cell w={cw(9,3)}>{"VESSEL    : TBA"}</Cell>
        </Row>

        {/* R2: Address | INVOICE | PORT OF LOADING */}
        <Row>
          <Cell w={cw(0,2)}>Address</Cell>
          <Cell w={cw(2,4)}>{con.address}</Cell>
          <Cell w={cw(6,1)} bold>INVOICE</Cell>
          <Cell w={cw(7,2)}>{`: ${invNo}`}</Cell>
          <Cell w={cw(9,3)}>{"PORT OF LOADING  : ANY"}</Cell>
        </Row>

        {/* R3: Port | SALES PERSON | PORT OF UNLOADING */}
        <Row>
          <Cell w={cw(0,2)}>Port</Cell>
          <Cell w={cw(2,4)}>{con.port}</Cell>
          <Cell w={cw(6,1)} bold>SALES PERSON</Cell>
          <Cell w={cw(7,2)}>{`: ${salesPerson}`}</Cell>
          <Cell w={cw(9,3)}>{`PORT OF UNLOADING : ${con.port}`}</Cell>
        </Row>

        {/* R4: Country | SHIPMENT TYPE | ETD */}
        <Row>
          <Cell w={cw(0,2)}>Country</Cell>
          <Cell w={cw(2,4)}>{con.country}</Cell>
          <Cell w={cw(6,1)} bold>SHIPMENT TYPE</Cell>
          <Cell w={cw(7,2)}>: RORO</Cell>
          <Cell w={cw(9,3)}>{"ETD        : TBA"}</Cell>
        </Row>

        {/* R5: Phone | INCOTERM | COUNTRY */}
        <Row>
          <Cell w={cw(0,2)}>Phone</Cell>
          <Cell w={cw(2,4)}>{con.phone}</Cell>
          <Cell w={cw(6,1)} bold>INCOTERM</Cell>
          <Cell w={cw(7,2)}>: C&F</Cell>
          <Cell w={cw(9,3)}>{`COUNTRY   : ${con.country}`}</Cell>
        </Row>

        {/* R6: Email */}
        <Row>
          <Cell w={cw(0,2)}>Email</Cell>
          <Cell w={cw(2,4)}>—</Cell>
          <Cell w={cw(6,1)}></Cell>
          <Cell w={cw(7,2)}></Cell>
          <Cell w={cw(9,3)}></Cell>
        </Row>

        {/* R7: NOTIFY PARTY */}
        <Row>
          <Cell w={cw(0,6)} bold>NOTIFY PARTY :</Cell>
          <Cell w={cw(6,1)}></Cell>
          <Cell w={cw(7,2)}></Cell>
          <Cell w={cw(9,3)}></Cell>
        </Row>

        {/* R8 */}
        <Row>
          <Cell w={cw(0,6)} bold>Same as consignee</Cell>
          <Cell w={cw(6,3)}></Cell>
          <Cell w={cw(9,3)}></Cell>
        </Row>

        {/* R9: PAYMENT TERMS shaded */}
        <Row>
          <Cell w={cw(0,6)} bold>Same as consignee</Cell>
          <Cell w={cw(6,3)}></Cell>
          <Cell w={cw(9,3)} bold shaded>{`PAYMENT TERMS : ${advPct}% (Advance Payment)`}</Cell>
        </Row>

        {/* R10: CURRENCY */}
        <Row>
          <Cell w={cw(0,6)} bold>Same as consignee</Cell>
          <Cell w={cw(6,3)}></Cell>
          <Cell w={cw(9,3)} bold>{"CURRENCY      : US$"}</Cell>
        </Row>

        {/* R11: Vehicle header (shaded) */}
        <Row>
          <Cell w={cw(0,1)} bold shaded>S.No</Cell>
          <Cell w={cw(1,3)} bold shaded>{"Chassis No. (STOCK ID)\nORIGIN"}</Cell>
          <Cell w={cw(4,2)} bold shaded>DESCRIPTION & DETAILS</Cell>
          <Cell w={cw(6,1)} bold shaded>YEAR MONTH & ENGINE CC</Cell>
          <Cell w={cw(7,2)} bold shaded>TRANS & FUEL</Cell>
          <Cell w={cw(9,1)} bold shaded>QTY</Cell>
          <Cell w={cw(10,1)} bold shaded>C&F US$</Cell>
          <Cell w={cw(11,1)} bold shaded>TOTAL US$</Cell>
        </Row>

        {/* R12: VEHICLE(S) */}
        <Row>
          <Cell w={cw(0,12)} bold>VEHICLE(S)</Cell>
        </Row>

        {/* R13: Data row */}
        <Row>
          <Cell w={cw(0,1)}>1</Cell>
          <Cell w={cw(1,3)}>{`${inv.chassisNo}\nORIGIN: JAPAN`}</Cell>
          <Cell w={cw(4,2)}>{inv.unit}</Cell>
          <Cell w={cw(6,1)}>{`${year}\n${engine}`}</Cell>
          <Cell w={cw(7,2)}>{`${transmission}\n${fuel}`}</Cell>
          <Cell w={cw(9,1)}>1</Cell>
          <Cell w={cw(10,1)}>{fmt(inv.cnfPrice)}</Cell>
          <Cell w={cw(11,1)}>{fmt(inv.cnfPrice)}</Cell>
        </Row>

        {/* R14: Total Amount */}
        <Row>
          <Cell w={cw(0,1)}></Cell>
          <Cell w={cw(1,3)}></Cell>
          <Cell w={cw(4,4)}></Cell>
          <Cell w={cw(8,3)} bold>Total Amount</Cell>
          <Cell w={cw(11,1)} bold>{fmt(inv.cnfPrice)}</Cell>
        </Row>

        {/* R15: advPct% Amount */}
        <Row>
          <Cell w={cw(0,1)}></Cell>
          <Cell w={cw(1,3)}></Cell>
          <Cell w={cw(4,4)}></Cell>
          <Cell w={cw(8,3)} bold>{`${advPct}% Amount`}</Cell>
          <Cell w={cw(11,1)} bold>{fmt(advanceAmt)}</Cell>
        </Row>

        {/* R16: Remaining Balance (shaded) */}
        <Row>
          <Cell w={cw(0,1)}></Cell>
          <Cell w={cw(1,3)}></Cell>
          <Cell w={cw(4,4)}></Cell>
          <Cell w={cw(8,3)} bold shaded>Remaining Balance</Cell>
          <Cell w={cw(11,1)} bold shaded>{fmt(remaining)}</Cell>
        </Row>

        {/* R17: Total Amount in Words */}
        <Row>
          <Cell w={cw(0,9)} bold>{`TOTAL AMOUNT VALUE IN WORDS : ${words} US DOLLARS ONLY`}</Cell>
          <Cell w={cw(9,3)}></Cell>
        </Row>

        {/* R18: PERFORMA INVOICE */}
        <Row>
          <Cell w={cw(0,9)} bold>{`PROFORMA INVOICE : ${invNo}`}</Cell>
          <Cell w={cw(9,3)}></Cell>
        </Row>

        {/* R19-R24: Bank details left | REMARKS right (vertical span) */}
        <View style={s.row}>
          {/* Left: 6 stacked rows */}
          <View style={{ width: cw(0,8) }}>
            <Row>
              <Cell w={cw(0,8)} bold>{"   SHIPPER'S BANK DETAILS:"}</Cell>
            </Row>
            <Row>
              <Cell w={cw(0,3)} bold>ACCOUNT:</Cell>
              <Cell w={cw(3,3)} bold>{SBK.bankAccount}</Cell>
              <Cell w={cw(6,2)}></Cell>
            </Row>
            <Row>
              <Cell w={cw(0,3)} bold>BANK:</Cell>
              <Cell w={cw(3,3)} bold>{SBK.bankName}</Cell>
              <Cell w={cw(6,2)}></Cell>
            </Row>
            <Row>
              <Cell w={cw(0,3)} bold>BRANCH:</Cell>
              <Cell w={cw(3,3)} bold>{SBK.bankBranch}</Cell>
              <Cell w={cw(6,2)}></Cell>
            </Row>
            <Row>
              <Cell w={cw(0,3)} bold>ADDRESS:</Cell>
              <Cell w={cw(3,3)} bold>{SBK.bankAddress}</Cell>
              <Cell w={cw(6,2)}></Cell>
            </Row>
            <Row>
              <Cell w={cw(0,3)} bold>IBAN:</Cell>
              <Cell w={cw(3,3)} bold>{SBK.iban}</Cell>
              <Cell w={cw(6,2)}></Cell>
            </Row>
          </View>
          {/* Right: REMARKS spanning all 6 rows */}
          <View style={[s.cell, { width: cw(8,4) }]}>
            <Text>{"REMARKS:\nPLEASE PAY BANK CHARGES OR PAYPAL CHARGES OR CREDIT CARD CHARGES.\n\nPLEASE READ TERMS AND CONDITION BELOW."}</Text>
          </View>
        </View>

        {/* R25: ACCOUNT NO */}
        <Row>
          <Cell w={cw(0,3)} bold>ACCOUNT NO:</Cell>
          <Cell w={cw(3,3)} bold>{SBK.accountNo}</Cell>
          <Cell w={cw(6,2)}></Cell>
          <Cell w={cw(8,4)}></Cell>
        </Row>

        {/* R26: SWIFT CODE */}
        <Row>
          <Cell w={cw(0,3)} bold>SWIFT CODE:</Cell>
          <Cell w={cw(3,3)} bold>{SBK.swift}</Cell>
          <Cell w={cw(6,2)}></Cell>
          <Cell w={cw(8,4)}></Cell>
        </Row>

        {/* R27: Signature + Stamp */}
        <View style={[s.cell, { width: cw(0,12), minHeight: H * 4 }]}>
          <Image src={stampUrl} style={{ width: 70, height: 68 }} />
          <Text>SM Khurram Rashid</Text>
          <Text>Director International Sales</Text>
        </View>

        {/* Terms and Conditions */}
        <View style={{ marginTop: 5 }}>
          <Text style={[s.term, s.bold]}>Terms and Conditions:</Text>
          {TERMS.map((t, i) => (
            <Text key={i} style={s.term}>{`${i + 1}. ${t}`}</Text>
          ))}
        </View>

      </Page>
    </Document>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function generateSBKPdf(inv: SBKInvData): Promise<Buffer> {
  const logoPath  = path.join(process.cwd(), "public/images/sbk-logo.jpg");
  const stampPath = path.join(process.cwd(), "public/images/sbk-stamp.jpg");
  const logoUrl   = `data:image/jpeg;base64,${fs.readFileSync(logoPath).toString("base64")}`;
  const stampUrl  = `data:image/jpeg;base64,${fs.readFileSync(stampPath).toString("base64")}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(
    React.createElement(SBKDocument, { inv, logoUrl, stampUrl }) as any
  ) as Promise<Buffer>;
}
