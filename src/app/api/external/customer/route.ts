// For the SBK website: one customer's complete CRM record by email - every
// invoice with its payments, the car(s) on it and each car's photos and
// documents (as metadata; bytes come from /api/external/files/[id]).
// Internal figures (push price, m3 rate, exchange rates, costs, profit,
// receipts, rejection notes) are deliberately not part of it.
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/pg";
import { CUSTOMER_EMAIL_SQL, invoiceNumber, verifyApiRequest } from "@/lib/website-link";
import { getVehiclesForInvoices } from "@/lib/invoice-vehicles";

export const dynamic = "force-dynamic";

type Num = string | number | null;

interface InvoiceRow {
  id: string;
  created_at: string;
  status: string;
  unit: string | null;
  chassis_no: string | null;
  engine_no: string | null;
  color: string | null;
  year: string | null;
  fuel: string | null;
  transmission: string | null;
  salesperson: string | null;
  consignee_name: string | null;
  consignee_address: string | null;
  consignee_port: string | null;
  consignee_country: string | null;
  consignee_phone: string | null;
  consignee_email: string | null;
  cnf_price: Num;
  advance_percent: Num;
  uploaded_pdf_filename: string | null;
  uploaded_pdf_uploaded_at: string | null;
  has_pdf: boolean;
  customer_name: string | null;
  contact_person: string | null;
  lead_phone: string | null;
  lead_email: string | null;
  lead_country: string | null;
  lead_port: string | null;
  lead_address: string | null;
}

interface PaymentRow { id: string; invoice_id: string; amount_received: Num; received_date: string }

interface UnitRow {
  id: string;
  invoice_id: string;
  make: string | null;
  car_model: string | null;
  year: Num;
  color: string | null;
  chassis: string | null;
  engine_cc: Num;
  drive: string | null;
  fuel: string | null;
  mileage: Num;
  transmission: string | null;
  steering: string | null;
  doors: Num;
  seats: Num;
  location: string | null;
}

interface FileRow { id: string; unit_id: string; folder: string; filename: string; mimetype: string | null; size: Num; uploaded_at: string }

const num = (v: Num) => (v === null || v === undefined || v === "" ? null : Number(v));
const text = (v: string | null | undefined) => (v ?? "").trim();

export async function GET(req: NextRequest) {
  if (!verifyApiRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = (req.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) return NextResponse.json({ error: "A valid email is required" }, { status: 400 });

  const invoices = await query<InvoiceRow>(
    `SELECT i.id, i.created_at, i.status, i.unit, i.chassis_no, i.engine_no, i.color, i.year, i.fuel,
            i.transmission, i.salesperson, i.consignee_name, i.consignee_address, i.consignee_port,
            i.consignee_country, i.consignee_phone, i.consignee_email, i.cnf_price, i.advance_percent,
            i.uploaded_pdf_filename, i.uploaded_pdf_uploaded_at,
            (i.uploaded_pdf_data IS NOT NULL AND i.uploaded_pdf_data <> '') AS has_pdf,
            l.customer_name, l.contact_person, l.phone AS lead_phone, l.email AS lead_email,
            l.country AS lead_country, l.port AS lead_port, l.address AS lead_address
     FROM invoices i JOIN leads l ON l.id = i.lead_id
     WHERE ${CUSTOMER_EMAIL_SQL} = $1
     ORDER BY i.created_at DESC`,
    [email]
  );

  if (invoices.length === 0) {
    return NextResponse.json({ customer: null, invoices: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const invoiceIds = invoices.map((i) => i.id);
  const [payments, units, vehiclesByInvoice] = await Promise.all([
    query<PaymentRow>(
      `SELECT id, invoice_id, amount_received, received_date FROM payments
       WHERE invoice_id = ANY($1) ORDER BY received_date ASC, created_at ASC`,
      [invoiceIds]
    ),
    query<UnitRow>(
      `SELECT id, invoice_id, make, car_model, year, color, chassis, engine_cc, drive, fuel, mileage,
              transmission, steering, doors, seats, location
       FROM units WHERE invoice_id = ANY($1) ORDER BY created_at ASC`,
      [invoiceIds]
    ),
    // Push prices stay internal: only the vehicle and its CNF price go out.
    getVehiclesForInvoices(invoices as unknown as Record<string, unknown>[]),
  ]);

  const files = units.length
    ? await query<FileRow>(
        `SELECT id, unit_id, folder, filename, mimetype, size, uploaded_at FROM unit_files
         WHERE unit_id = ANY($1) ORDER BY folder ASC, uploaded_at ASC`,
        [units.map((u) => u.id)]
      )
    : [];

  const latest = invoices[0];
  const customer = {
    email,
    name: text(latest.customer_name) || text(latest.consignee_name),
    contactPerson: text(latest.contact_person),
    phone: text(latest.lead_phone) || text(latest.consignee_phone),
    country: text(latest.lead_country) || text(latest.consignee_country),
    port: text(latest.lead_port) || text(latest.consignee_port),
    address: text(latest.lead_address) || text(latest.consignee_address),
  };

  const result = invoices.map((inv) => {
    const cnfPrice = num(inv.cnf_price) ?? 0;
    const advancePercent = num(inv.advance_percent) ?? 50;
    let running = cnfPrice;
    const invPayments = payments
      .filter((p) => p.invoice_id === inv.id)
      .map((p) => {
        const amount = num(p.amount_received) ?? 0;
        running -= amount;
        return { id: p.id, amount, date: p.received_date, balanceAfter: running };
      });
    const paid = invPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      id: inv.id,
      number: invoiceNumber(inv.id),
      status: inv.status,
      createdAt: inv.created_at,
      unit: text(inv.unit),
      chassisNo: text(inv.chassis_no),
      engineNo: text(inv.engine_no),
      color: text(inv.color),
      year: text(inv.year),
      fuel: text(inv.fuel),
      transmission: text(inv.transmission),
      salesperson: text(inv.salesperson),
      // Every vehicle on the invoice (the fields above are vehicle 1).
      vehicles: (vehiclesByInvoice.get(inv.id) ?? []).map((v) => ({
        unit: v.unit,
        chassisNo: v.chassisNo,
        engineNo: v.engineNo,
        color: v.color,
        year: v.year,
        fuel: v.fuel,
        transmission: v.transmission,
        cnfPrice: v.cnfPrice,
      })),
      consignee: {
        name: text(inv.consignee_name),
        address: text(inv.consignee_address),
        port: text(inv.consignee_port),
        country: text(inv.consignee_country),
        phone: text(inv.consignee_phone),
        email: text(inv.consignee_email),
      },
      cnfPrice,
      advancePercent,
      advanceAmount: Math.round((cnfPrice * advancePercent) / 100),
      paid,
      balance: cnfPrice - paid,
      pdf: inv.has_pdf
        ? { filename: text(inv.uploaded_pdf_filename) || `${invoiceNumber(inv.id)}.pdf`, uploadedAt: inv.uploaded_pdf_uploaded_at }
        : null,
      payments: invPayments,
      units: units
        .filter((u) => u.invoice_id === inv.id)
        .map((u) => ({
          id: u.id,
          make: text(u.make),
          model: text(u.car_model),
          year: num(u.year),
          color: text(u.color),
          chassis: text(u.chassis),
          engineCC: num(u.engine_cc),
          drive: text(u.drive),
          fuel: text(u.fuel),
          mileage: num(u.mileage),
          transmission: text(u.transmission),
          steering: text(u.steering),
          doors: num(u.doors),
          seats: num(u.seats),
          location: text(u.location),
          files: files
            .filter((f) => f.unit_id === u.id)
            .map((f) => ({
              id: f.id,
              folder: f.folder,
              filename: f.filename,
              mimetype: f.mimetype ?? "application/octet-stream",
              size: num(f.size) ?? 0,
              uploadedAt: f.uploaded_at,
              isImage: (f.mimetype ?? "").startsWith("image/"),
            })),
        })),
    };
  });

  return NextResponse.json({ customer, invoices: result }, { headers: { "Cache-Control": "no-store" } });
}
