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
export interface JDMInvData {
  _id: unknown;
  consignee: ConsigneeData;
  unit: string;
  year?: string;
  chassisNo: string;
  engineNo?: string;
  color: string;
  cnfPrice: number;
  advancePercent?: number;
  fuel?: string;
  transmission?: string;
  createdAt: Date | string;
}

// ── vehicle table column widths (pt) — 10 cols summing to 523 ────────────────
// No. | MAKE | MODEL | CHASSIS | YEAR | COLOR | ENGINE SIZE | QTY | CNF$ | TOTAL
const JW = [25, 45, 45, 65, 35, 40, 110, 25, 62, 71];
const LEFT_W   = JW[0]+JW[1]+JW[2]+JW[3]+JW[4]+JW[5]; // 255 — No. through COLOR
const LABEL_W  = JW[6]+JW[7];                          // 135 — ENGINE + QTY
const USD_W    = JW[8];                                 //  62 — CNF$
const VAL_W    = JW[9];                                 //  71 — TOTAL

const JDM = {
  name:       "JDM TRADING CO. LTD",
  bankBranch1:"1-203, TAKBATA, NAKAGAWA-KU,",
  bankBranch2:"NAGOYA-SHI, AICHI 454-0911, JAPAN",
  bankName:   "MITSUBISHI UFJ",
  accountNo:  "0282462",
  swift:      "BOTKJPJT",
  accountName:"JDM TRADING CO. LTD",
};

// ── styles ────────────────────────────────────────────────────────────────────
const DARK = "#1a1a2e";
const RED  = "#8B0000";
const H    = 15; // default cell min-height

const s = StyleSheet.create({
  page: {
    paddingTop: 28, paddingBottom: 28,
    paddingLeft: 36, paddingRight: 36,
    fontSize: 8, fontFamily: "Helvetica",
  },
  row:    { flexDirection: "row" },
  cell:   {
    borderWidth: 0.5, borderColor: "#AAAAAA",
    paddingHorizontal: 2, paddingVertical: 1,
  },
  hdrCell: {
    borderWidth: 0.5, borderColor: "#AAAAAA",
    paddingHorizontal: 2, paddingVertical: 2,
    backgroundColor: DARK,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    textAlign: "center",
    minHeight: H,
  },
  bold:   { fontFamily: "Helvetica-Bold" },
  shaded: { backgroundColor: "#F0F0F0" },
});

// ── Cell components ───────────────────────────────────────────────────────────
function Cell({ w, h = H, bold = false, right = false, children }: {
  w: number; h?: number; bold?: boolean; right?: boolean; children?: string;
}) {
  return (
    <View style={[s.cell, { width: w, minHeight: h }]}>
      <Text style={[bold ? s.bold : {}, right ? { textAlign: "right" } : {}]}>
        {children ?? ""}
      </Text>
    </View>
  );
}

function HdrCell({ w, children }: { w: number; children: string }) {
  return (
    <View style={[s.hdrCell, { width: w }]}>
      <Text>{children}</Text>
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={s.row}>{children}</View>;
}

// ── Document component ────────────────────────────────────────────────────────
function JDMDocument({ inv, logoUrl }: { inv: JDMInvData; logoUrl: string }) {
  const date = new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const id   = String(inv._id);
  const invNo = `JDM-${id.slice(-5).toUpperCase()}`;

  const advPct     = inv.advancePercent ?? 50;
  const advanceAmt = Math.round(inv.cnfPrice * advPct / 100);
  const remaining  = inv.cnfPrice - advanceAmt;

  const unitParts = inv.unit.split(" ");
  const make  = unitParts[0] ?? inv.unit;
  const model = unitParts.slice(1).join(" ") || inv.unit;

  const transmission = inv.transmission || "";
  const fuel         = inv.fuel         || "";
  const transFuel    = [transmission, fuel].filter(Boolean).join(" / ");
  const engineCell   = [inv.engineNo, transFuel].filter(Boolean).join(" / ") || "";

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const con = inv.consignee;

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Letterhead logo */}
        <Image src={logoUrl} style={{ width: 450, height: 75, marginBottom: 4 }} />

        {/* Company name */}
        <Text style={{
          fontFamily: "Helvetica-Bold", fontSize: 13,
          color: RED, textAlign: "center", marginBottom: 6,
        }}>
          {JDM.name}
        </Text>

        {/* ADDRESS (left) + BANKING DETAILS (right) */}
        <View style={[s.row, { marginBottom: 4 }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8 }}>          ADDRESS:</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8 }}>BANKING DETAILS:</Text>
            <Text style={{ fontSize: 7.5 }}>{`ACCOUNT NAME: ${JDM.accountName}`}</Text>
            <Text style={{ fontSize: 7.5 }}>{`BANK NAME: ${JDM.bankName}`}</Text>
            <Text style={{ fontSize: 7.5 }}>{`BRANCH ADDRESS: ${JDM.bankBranch1}`}</Text>
            <Text style={{ fontSize: 7.5 }}>{JDM.bankBranch2}</Text>
            <Text style={{ fontSize: 7.5 }}>{`ACCOUNT # ${JDM.accountNo}`}</Text>
            <Text style={{ fontSize: 7.5 }}>{`SWIFT CODE: ${JDM.swift}`}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={{ borderBottomWidth: 0.5, borderBottomColor: "#AAAAAA", marginBottom: 6 }} />

        {/* CONSIGNEE + NOTIFY PARTY */}
        <View style={[s.row, { marginBottom: 6 }]}>
          {/* Left: Consignee */}
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[s.bold, { marginBottom: 3 }]}>CONSIGNEE:</Text>
            <View style={[s.row, { marginBottom: 1 }]}>
              <Text style={{ width: 55, fontSize: 7.5 }}>NAME :</Text>
              <Text style={{ flex: 1, fontFamily: "Helvetica-Bold", fontSize: 7.5 }}>{con.name}</Text>
            </View>
            <View style={[s.row, { marginBottom: 1 }]}>
              <Text style={{ width: 55, fontSize: 7.5 }}>ADDRESS:</Text>
              <Text style={{ flex: 1, fontSize: 7.5 }}>{con.address}</Text>
            </View>
            <View style={[s.row, { marginBottom: 1 }]}>
              <Text style={{ width: 55, fontSize: 7.5 }}>PHONE:</Text>
              <Text style={{ flex: 1, fontSize: 7.5 }}>{con.phone}</Text>
            </View>
            <View style={[s.row, { marginBottom: 1 }]}>
              <Text style={{ width: 55, fontSize: 7.5 }}>POD:</Text>
              <Text style={{ flex: 1, fontSize: 7.5 }}>{con.port}</Text>
            </View>
            <View style={s.row}>
              <Text style={{ width: 55, fontSize: 7.5 }}>COUNTRY :</Text>
              <Text style={{ flex: 1, fontSize: 7.5 }}>{con.country}</Text>
            </View>
          </View>

          {/* Right: Notify Party + Date + Invoice */}
          <View style={{ flex: 1, paddingLeft: 8 }}>
            <Text style={[s.bold, { marginBottom: 3 }]}>NOTIFY PARTY:</Text>
            <View style={[s.row, { marginBottom: 1 }]}>
              <Text style={{ width: 55, fontSize: 7.5 }}>NAME:</Text>
              <Text style={{ flex: 1, fontSize: 7.5 }}>SAME</Text>
            </View>
            <View style={[s.row, { marginBottom: 1 }]}>
              <Text style={{ width: 55, fontSize: 7.5 }}>Address :</Text>
              <Text style={{ flex: 1, fontSize: 7.5 }}>SAME</Text>
            </View>
            <View style={{ marginTop: 6 }}>
              <Text style={[s.bold, { fontSize: 7.5 }]}>{`DATE: ${date}`}</Text>
              <Text style={[s.bold, { fontSize: 7.5 }]}>{`INVOICE # ${invNo}`}</Text>
            </View>
          </View>
        </View>

        {/* Vehicle table spacer */}
        <View style={{ marginBottom: 2 }} />

        {/* Vehicle table header */}
        <Row>
          <HdrCell w={JW[0]}>No.</HdrCell>
          <HdrCell w={JW[1]}>MAKE</HdrCell>
          <HdrCell w={JW[2]}>MODEL</HdrCell>
          <HdrCell w={JW[3]}>CHASSIS</HdrCell>
          <HdrCell w={JW[4]}>YEAR</HdrCell>
          <HdrCell w={JW[5]}>COLOR</HdrCell>
          <HdrCell w={JW[6]}>ENGINE SIZE</HdrCell>
          <HdrCell w={JW[7]}>QTY</HdrCell>
          <HdrCell w={JW[8]}>CNF$</HdrCell>
          <HdrCell w={JW[9]}>TOTAL AMOUNT $</HdrCell>
        </Row>

        {/* Blank row */}
        <Row>
          {JW.map((w, i) => <Cell key={i} w={w} />)}
        </Row>

        {/* Vehicle data row */}
        <Row>
          <Cell w={JW[0]}>1</Cell>
          <Cell w={JW[1]}>{make}</Cell>
          <Cell w={JW[2]}>{model}</Cell>
          <Cell w={JW[3]}>{inv.chassisNo}</Cell>
          <Cell w={JW[4]}>{inv.year ?? ""}</Cell>
          <Cell w={JW[5]}>{inv.color}</Cell>
          <Cell w={JW[6]}>{engineCell}</Cell>
          <Cell w={JW[7]}>1</Cell>
          <Cell w={JW[8]} right>{fmt(inv.cnfPrice)}</Cell>
          <Cell w={JW[9]} right>{fmt(inv.cnfPrice)}</Cell>
        </Row>

        {/* Empty filler rows */}
        {[0,1,2,3,4,5,6,7,8].map(i => (
          <Row key={i}>
            {JW.map((w, j) => <Cell key={j} w={w} />)}
          </Row>
        ))}

        {/* Separator */}
        <Row>
          {JW.map((w, i) => <Cell key={i} w={w} />)}
        </Row>

        {/* Totals */}
        <Row>
          <Cell w={LEFT_W}></Cell>
          <Cell w={LABEL_W} bold right>{`${advPct}% ADVANCE PAYMENT`}</Cell>
          <Cell w={USD_W} bold>US$</Cell>
          <Cell w={VAL_W} bold right>{fmt(advanceAmt)}</Cell>
        </Row>
        <Row>
          <Cell w={LEFT_W}></Cell>
          <Cell w={LABEL_W} bold right>BALANCE</Cell>
          <Cell w={USD_W} bold>US$</Cell>
          <Cell w={VAL_W} bold right>{fmt(remaining)}</Cell>
        </Row>

        {/* Special Notes + Total Sales Price */}
        <Row>
          <Cell w={LEFT_W} bold>Special Notes and Instructions</Cell>
          <Cell w={LABEL_W} bold right>TOTAL SALES PRICE</Cell>
          <Cell w={USD_W} bold>US$</Cell>
          <Cell w={VAL_W} bold right>{fmt(inv.cnfPrice)}</Cell>
        </Row>

        {/* Notes */}
        <View style={{ marginTop: 6 }}>
          <Text style={[s.bold, { fontSize: 7.5, marginBottom: 1 }]}>Shipping:</Text>
          <Text style={{ fontSize: 7 }}>
            {"=>  After receiving deposit/payment original Bill of Lading will be released once full payment is received."}
          </Text>
          <Text style={[s.bold, { fontSize: 7.5, marginTop: 3, marginBottom: 1 }]}>Conditions:</Text>
          <Text style={{ fontSize: 7 }}>{"=>  Please confirm import regulations with your local authority before purchase."}</Text>
          <Text style={{ fontSize: 7 }}>{"=>  Price stated in the invoice does not cover any bank charges."}</Text>
          <Text style={{ fontSize: 7 }}>{"=>  Or additional charges payable to the bank."}</Text>
          <Text style={{ fontSize: 7 }}>{"=>  All bank charges must be paid by the customer."}</Text>
          <Text style={{ fontSize: 7 }}>{"=>  This is a computer generated invoice and requires no signature."}</Text>
        </View>

      </Page>
    </Document>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function generateJDMPdf(inv: JDMInvData): Promise<Buffer> {
  const logoPath = path.join(process.cwd(), "public/images/jdm-logo.jpg");
  const logoUrl  = `data:image/jpeg;base64,${fs.readFileSync(logoPath).toString("base64")}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(
    React.createElement(JDMDocument, { inv, logoUrl }) as any
  ) as Promise<Buffer>;
}
