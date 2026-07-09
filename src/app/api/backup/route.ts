import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/pg";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [leads, invoices, payments, units, financials] = await Promise.all([
    query(`SELECT l.*, u.name AS created_by_name FROM leads l LEFT JOIN users u ON u.id = l.created_by`),
    query(`SELECT i.id, i.lead_id, i.created_by, i.approved_by, i.consignee_name, i.unit, i.chassis_no, i.engine_no, i.color, i.year,
                  i.m3_rate, i.exchange_rate, i.push_price, i.cnf_price, i.status, i.created_at,
                  cu.name AS created_by_name, au.name AS approved_by_name, ld.customer_name AS lead_customer_name
           FROM invoices i
           LEFT JOIN users cu ON cu.id = i.created_by
           LEFT JOIN users au ON au.id = i.approved_by
           LEFT JOIN leads ld ON ld.id = i.lead_id`),
    query(`SELECT p.*, i.unit AS invoice_unit, i.chassis_no AS invoice_chassis_no, u.name AS recorded_by_name
           FROM payments p LEFT JOIN invoices i ON i.id = p.invoice_id LEFT JOIN users u ON u.id = p.recorded_by`),
    query(`SELECT un.*, u.name AS created_by_name FROM units un LEFT JOIN users u ON u.id = un.created_by`),
    query(`SELECT f.*, un.chassis AS unit_chassis, un.year AS unit_year, un.make AS unit_make, un.car_model AS unit_car_model
           FROM unit_financials f LEFT JOIN units un ON un.id = f.unit_id`),
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
      customerName:  l.customer_name ?? "",
      contactPerson: l.contact_person ?? "",
      phone:         l.phone ?? "",
      email:         l.email ?? "",
      country:       l.country ?? "",
      port:          l.port ?? "",
      status:        l.status ?? "",
      isCustomer:    l.is_customer ? "Yes" : "No",
      agent:         l.created_by_name ?? "",
      createdAt:     l.created_at ? new Date(l.created_at).toLocaleDateString("en-GB") : "",
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
      customer:     inv.lead_customer_name ?? inv.consignee_name ?? "",
      unit:         inv.unit ?? "",
      chassisNo:    inv.chassis_no ?? "",
      engineNo:     inv.engine_no ?? "",
      color:        inv.color ?? "",
      year:         inv.year ?? "",
      m3Rate:       Number(inv.m3_rate) || 0,
      exchangeRate: Number(inv.exchange_rate) || 0,
      pushPrice:    Number(inv.push_price) || 0,
      cnfPrice:     Number(inv.cnf_price) || 0,
      status:       inv.status ?? "",
      createdBy:    inv.created_by_name ?? "",
      approvedBy:   inv.approved_by_name ?? "",
      createdAt:    inv.created_at ? new Date(inv.created_at).toLocaleDateString("en-GB") : "",
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
      invoiceUnit:    p.invoice_unit ?? "",
      chassisNo:      p.invoice_chassis_no ?? "",
      sellingPrice:   Number(p.selling_price) || 0,
      amountReceived: Number(p.amount_received) || 0,
      receivedDate:   p.received_date ? new Date(p.received_date).toLocaleDateString("en-GB") : "",
      exchangeRate:   Number(p.exchange_rate) || 0,
      yenAmount:      Number(p.yen_amount) || 0,
      recordedBy:     p.recorded_by_name ?? "",
      createdAt:      p.created_at ? new Date(p.created_at).toLocaleDateString("en-GB") : "",
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
      carModel:     u.car_model ?? "",
      year:         u.year ?? "",
      color:        u.color ?? "",
      chassis:      u.chassis ?? "",
      engineCC:     u.engine_cc ?? 0,
      drive:        u.drive ?? "",
      fuel:         u.fuel ?? "",
      mileage:      u.mileage ?? 0,
      transmission: u.transmission ?? "",
      steering:     u.steering ?? "",
      doors:        u.doors ?? 0,
      seats:        u.seats ?? 0,
      location:     u.location ?? "",
      createdBy:    u.created_by_name ?? "",
      createdAt:    u.created_at ? new Date(u.created_at).toLocaleDateString("en-GB") : "",
    });
  });

  // ── Sheet 5: Financial ─────────────────────────────────────────
  const wsFinancial = wb.addWorksheet("Financial");
  wsFinancial.columns = [
    { key: "no",           width: 6  },
    { key: "chassis",      width: 20 },
    { key: "vehicle",      width: 22 },
    { key: "currency",     width: 10 },
    { key: "lotNo",        width: 14 },
    { key: "auctionName",  width: 20 },
    { key: "buying",       width: 16 },
    { key: "domestic",     width: 14 },
    { key: "storage",      width: 14 },
    { key: "inspect",      width: 14 },
    { key: "repairs",      width: 14 },
    { key: "misc",         width: 12 },
    { key: "agencyFee",    width: 14 },
    { key: "freight",      width: 14 },
    { key: "dhl",          width: 12 },
    { key: "costOfUnitJPY",width: 18 },
    { key: "exchangeRate", width: 14 },
    { key: "costOfUnitUSD",width: 18 },
    { key: "directCostUSD",width: 18 },
    { key: "sellingPrice", width: 16 },
    { key: "profit",       width: 16 },
    { key: "updatedAt",    width: 16 },
  ];
  applyHeaders(wsFinancial, [
    "#", "Chassis", "Vehicle", "Currency",
    "Lot No.", "Auction Name",
    "Buying (¥)", "Domestic (¥)", "Storage (¥)", "Inspect (¥)", "Repairs (¥)", "Misc (¥)", "Agency Fee (¥)", "Freight (¥)", "DHL (¥)",
    "Cost of Unit (¥)", "Exchange Rate", "Cost of Unit (USD)",
    "Direct Cost (USD)", "Selling Price (USD)", "Profit (USD)", "Updated At",
  ]);
  financials.forEach((f: any, i) => {
    const isJPY = f.currency === "JPY";
    wsFinancial.addRow({
      no:            i + 1,
      chassis:       f.unit_chassis ?? "",
      vehicle:       f.unit_id ? `${f.unit_year} ${f.unit_make} ${f.unit_car_model}` : "",
      currency:      f.currency ?? "",
      lotNo:         f.lot_no ?? "",
      auctionName:   f.auction_name ?? "",
      buying:        isJPY ? (Number(f.buying) || 0) : "",
      domestic:      isJPY ? (Number(f.domestic) || 0) : "",
      storage:       isJPY ? (Number(f.storage) || 0) : "",
      inspect:       isJPY ? (Number(f.inspect) || 0) : "",
      repairs:       isJPY ? (Number(f.repairs) || 0) : "",
      misc:          isJPY ? (Number(f.misc) || 0) : "",
      agencyFee:     isJPY ? (Number(f.agency_fee) || 0) : "",
      freight:       isJPY ? (Number(f.freight) || 0) : "",
      dhl:           isJPY ? (Number(f.dhl) || 0) : "",
      costOfUnitJPY: isJPY ? (Number(f.cost_of_unit_jpy) || 0) : "",
      exchangeRate:  isJPY ? (Number(f.exchange_rate) || 0) : "",
      costOfUnitUSD: isJPY ? (Number(f.cost_of_unit_usd) || 0) : "",
      directCostUSD: isJPY ? "" : (Number(f.cost_usd) || 0),
      sellingPrice:  Number(f.selling_price) || 0,
      profit:        Number(f.profit) || 0,
      updatedAt:     f.updated_at ? new Date(f.updated_at).toLocaleDateString("en-GB") : "",
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
