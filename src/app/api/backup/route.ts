import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Lead from "@/models/Lead";
import Invoice from "@/models/Invoice";
import Payment from "@/models/Payment";
import Unit from "@/models/Unit";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const [leads, invoices, payments, units] = await Promise.all([
    Lead.find().populate("createdBy", "name email").lean(),
    Invoice.find().populate("createdBy", "name email").populate("approvedBy", "name").populate("leadId", "customerName").lean(),
    Payment.find().populate("invoiceId", "unit chassisNo").populate("recordedBy", "name email").lean(),
    Unit.find().populate("createdBy", "name email").populate("invoiceId", "unit chassisNo").lean(),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Office CRM";
  wb.created = new Date();

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: "FFFFFFFF" }, size: 11 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFC0272D" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      bottom: { style: "thin", color: { argb: "FF8B1A1E" } },
    },
  };

  const applyHeaders = (ws: ExcelJS.Worksheet, headers: string[]) => {
    ws.addRow(headers);
    const headerRow = ws.getRow(1);
    headerRow.height = 22;
    headers.forEach((_, i) => {
      const cell = headerRow.getCell(i + 1);
      Object.assign(cell, { style: headerStyle });
    });
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  };

  // ── Sheet 1: Leads ──────────────────────────────────────────────
  const wsLeads = wb.addWorksheet("Leads");
  wsLeads.columns = [
    { key: "no",            width: 6  },
    { key: "customerName",  width: 22 },
    { key: "contactPerson", width: 22 },
    { key: "phone",         width: 18 },
    { key: "email",         width: 26 },
    { key: "country",       width: 16 },
    { key: "port",          width: 16 },
    { key: "status",        width: 18 },
    { key: "isCustomer",    width: 12 },
    { key: "agent",         width: 22 },
    { key: "createdAt",     width: 18 },
  ];
  applyHeaders(wsLeads, ["#", "Customer Name", "Contact Person", "Phone", "Email", "Country", "Port", "Status", "Is Customer", "Agent", "Created At"]);
  leads.forEach((l: any, i) => {
    wsLeads.addRow({
      no: i + 1,
      customerName:  l.customerName ?? "",
      contactPerson: l.contactPerson ?? "",
      phone:         l.phone ?? "",
      email:         l.email ?? "",
      country:       l.country ?? "",
      port:          l.port ?? "",
      status:        l.status ?? "",
      isCustomer:    l.isCustomer ? "Yes" : "No",
      agent:         l.createdBy?.name ?? "",
      createdAt:     l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-GB") : "",
    });
  });

  // ── Sheet 2: Invoices ───────────────────────────────────────────
  const wsInvoices = wb.addWorksheet("Invoices");
  wsInvoices.columns = [
    { key: "no",          width: 6  },
    { key: "customer",    width: 22 },
    { key: "unit",        width: 18 },
    { key: "chassisNo",   width: 20 },
    { key: "engineNo",    width: 20 },
    { key: "color",       width: 12 },
    { key: "year",        width: 10 },
    { key: "m3Rate",      width: 12 },
    { key: "exchangeRate",width: 14 },
    { key: "pushPrice",   width: 14 },
    { key: "cnfPrice",    width: 14 },
    { key: "status",      width: 14 },
    { key: "createdBy",   width: 20 },
    { key: "approvedBy",  width: 20 },
    { key: "createdAt",   width: 16 },
  ];
  applyHeaders(wsInvoices, ["#", "Customer", "Unit", "Chassis No", "Engine No", "Color", "Year", "M3 Rate", "Exchange Rate", "Push Price", "CNF Price", "Status", "Created By", "Approved By", "Created At"]);
  invoices.forEach((inv: any, i) => {
    wsInvoices.addRow({
      no:           i + 1,
      customer:     inv.leadId?.customerName ?? inv.consignee?.name ?? "",
      unit:         inv.unit ?? "",
      chassisNo:    inv.chassisNo ?? "",
      engineNo:     inv.engineNo ?? "",
      color:        inv.color ?? "",
      year:         inv.year ?? "",
      m3Rate:       inv.m3Rate ?? 0,
      exchangeRate: inv.exchangeRate ?? 0,
      pushPrice:    inv.pushPrice ?? 0,
      cnfPrice:     inv.cnfPrice ?? 0,
      status:       inv.status ?? "",
      createdBy:    inv.createdBy?.name ?? "",
      approvedBy:   inv.approvedBy?.name ?? "",
      createdAt:    inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-GB") : "",
    });
  });

  // ── Sheet 3: Payments ───────────────────────────────────────────
  const wsPayments = wb.addWorksheet("Payments");
  wsPayments.columns = [
    { key: "no",             width: 6  },
    { key: "invoiceUnit",    width: 20 },
    { key: "chassisNo",      width: 20 },
    { key: "sellingPrice",   width: 16 },
    { key: "amountReceived", width: 18 },
    { key: "receivedDate",   width: 16 },
    { key: "exchangeRate",   width: 14 },
    { key: "yenAmount",      width: 14 },
    { key: "recordedBy",     width: 20 },
    { key: "createdAt",      width: 16 },
  ];
  applyHeaders(wsPayments, ["#", "Invoice Unit", "Chassis No", "Selling Price", "Amount Received", "Received Date", "Exchange Rate", "Yen Amount", "Recorded By", "Created At"]);
  payments.forEach((p: any, i) => {
    wsPayments.addRow({
      no:             i + 1,
      invoiceUnit:    p.invoiceId?.unit ?? "",
      chassisNo:      p.invoiceId?.chassisNo ?? "",
      sellingPrice:   p.sellingPrice ?? 0,
      amountReceived: p.amountReceived ?? 0,
      receivedDate:   p.receivedDate ? new Date(p.receivedDate).toLocaleDateString("en-GB") : "",
      exchangeRate:   p.exchangeRate ?? 0,
      yenAmount:      p.yenAmount ?? 0,
      recordedBy:     p.recordedBy?.name ?? "",
      createdAt:      p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-GB") : "",
    });
  });

  // ── Sheet 4: Units ──────────────────────────────────────────────
  const wsUnits = wb.addWorksheet("Units");
  wsUnits.columns = [
    { key: "no",          width: 6  },
    { key: "make",        width: 16 },
    { key: "carModel",    width: 16 },
    { key: "year",        width: 10 },
    { key: "color",       width: 12 },
    { key: "chassis",     width: 20 },
    { key: "engineCC",    width: 12 },
    { key: "drive",       width: 12 },
    { key: "fuel",        width: 12 },
    { key: "mileage",     width: 12 },
    { key: "transmission",width: 14 },
    { key: "steering",    width: 12 },
    { key: "doors",       width: 10 },
    { key: "seats",       width: 10 },
    { key: "location",    width: 18 },
    { key: "createdBy",   width: 20 },
    { key: "createdAt",   width: 16 },
  ];
  applyHeaders(wsUnits, ["#", "Make", "Model", "Year", "Color", "Chassis", "Engine CC", "Drive", "Fuel", "Mileage", "Transmission", "Steering", "Doors", "Seats", "Location", "Added By", "Created At"]);
  units.forEach((u: any, i) => {
    wsUnits.addRow({
      no:           i + 1,
      make:         u.make ?? "",
      carModel:     u.carModel ?? "",
      year:         u.year ?? "",
      color:        u.color ?? "",
      chassis:      u.chassis ?? "",
      engineCC:     u.engineCC ?? 0,
      drive:        u.drive ?? "",
      fuel:         u.fuel ?? "",
      mileage:      u.mileage ?? 0,
      transmission: u.transmission ?? "",
      steering:     u.steering ?? "",
      doors:        u.doors ?? 0,
      seats:        u.seats ?? 0,
      location:     u.location ?? "",
      createdBy:    u.createdBy?.name ?? "",
      createdAt:    u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-GB") : "",
    });
  });

  // ── Generate file ───────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="CRM-Backup-${date}.xlsx"`,
    },
  });
}
