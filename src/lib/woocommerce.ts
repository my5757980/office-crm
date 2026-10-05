import { query, queryOne } from "@/lib/pg";
import { getInvoiceVehicles } from "@/lib/invoice-vehicles";

// Credentials live in the app_settings table (shared by both Vercel and cPanel
// deployments via the same database) rather than per-deploy-target env vars,
// since this project deploys to two separate hosts that don't share env config.
let settingsCache: Record<string, string> | null = null;

async function getSettings(): Promise<Record<string, string>> {
  if (settingsCache) return settingsCache;
  const rows = await query<{ key: string; value: string }>(`SELECT key, value FROM app_settings`);
  settingsCache = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return settingsCache;
}

async function wcFetch(path: string, options: { method?: string; body?: unknown } = {}) {
  const settings = await getSettings();
  const url = settings.wc_url;
  const key = settings.wc_consumer_key;
  const secret = settings.wc_consumer_secret;
  if (!url || !key || !secret) throw new Error("WooCommerce settings not configured");

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(`${url}/wp-json/wc/v3${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WooCommerce API ${options.method ?? "GET"} ${path} failed: ${res.status} ${text.slice(0, 300)}`);
  }
  return res.json();
}

// Uploads a file to the WordPress Media Library (wp/v2, not wc/v3 — needs a
// WordPress Application Password rather than the WooCommerce consumer keys).
async function uploadWpMedia(filename: string, mimetype: string, buffer: Buffer): Promise<string> {
  const settings = await getSettings();
  const url = settings.wc_url;
  const user = settings.wp_app_user;
  const pass = settings.wp_app_password;
  if (!url || !user || !pass) throw new Error("WordPress app-password settings not configured");

  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  const res = await fetch(`${url}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": mimetype,
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
    },
    body: buffer as unknown as BodyInit,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WordPress media upload failed: ${res.status} ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.source_url as string;
}

// Best-effort: uploads a newly-added unit document/photo to WordPress and
// links it in a customer-visible order note. Skipped silently if the unit's
// invoice hasn't been synced to WooCommerce yet (no email on file, etc.).
export async function syncUnitFileToWooCommerce(
  unitId: string,
  folder: string,
  filename: string,
  mimetype: string,
  buffer: Buffer
): Promise<void> {
  try {
    const invoice = await queryOne<{ wc_order_id: number | null }>(
      `SELECT i.wc_order_id FROM invoices i JOIN units u ON u.invoice_id = i.id WHERE u.id = $1`,
      [unitId]
    );
    if (!invoice || !invoice.wc_order_id) return;

    const mediaUrl = await uploadWpMedia(filename, mimetype, buffer);
    await addWcOrderNote(invoice.wc_order_id, `New document added — ${folder}: ${filename}\n${mediaUrl}`, true);

    // First uploaded photo becomes the order's list thumbnail (shown on the
    // customer's Orders list). Only set if not already present, so it stays stable.
    if (mimetype.startsWith("image/")) {
      await setWcOrderThumbnailIfEmpty(invoice.wc_order_id, mediaUrl);
    }
  } catch (err) {
    console.error("WooCommerce document sync failed for unit", unitId, err);
  }
}

// Sets the order's crm_thumbnail_url meta only if it isn't already set.
async function setWcOrderThumbnailIfEmpty(orderId: number, imageUrl: string): Promise<void> {
  try {
    const order = await wcFetch(`/orders/${orderId}`);
    const existing = Array.isArray(order.meta_data)
      ? order.meta_data.find((m: { key: string }) => m.key === "crm_thumbnail_url")
      : null;
    if (existing && existing.value) return;
    await wcFetch(`/orders/${orderId}`, {
      method: "PUT",
      body: { meta_data: [{ key: "crm_thumbnail_url", value: imageUrl }] },
    });
  } catch (err) {
    console.error("WooCommerce thumbnail meta set failed for order", orderId, err);
  }
}

export interface WcCustomerInput {
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  address?: string;
  country?: string;
}

// Finds an existing WooCommerce customer by email, or creates a new one.
// Never creates a duplicate account for the same email.
export async function findOrCreateWcCustomer(input: WcCustomerInput): Promise<number> {
  const existing = await wcFetch(`/customers?email=${encodeURIComponent(input.email)}`);
  if (Array.isArray(existing) && existing.length > 0) {
    const id = existing[0].id as number;
    // Keep billing address current — a customer's later invoices may carry a
    // fuller address than whatever was on file when the account was first made.
    if (input.address) {
      await wcFetch(`/customers/${id}`, {
        method: "PUT",
        body: { billing: { address_1: input.address, country: input.country ?? "" } },
      }).catch(() => {});
    }
    return id;
  }

  const created = await wcFetch(`/customers`, {
    method: "POST",
    body: {
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName ?? "",
      billing: {
        first_name: input.firstName,
        last_name: input.lastName ?? "",
        phone: input.phone ?? "",
        address_1: input.address ?? "",
        country: input.country ?? "",
        email: input.email,
      },
    },
  });
  return created.id as number;
}

export interface WcOrderInput {
  customerId: number;
  description: string;
  total: number;
  invoiceId: string;
  billing?: { firstName: string; lastName?: string; phone?: string; address?: string; country?: string; email: string };
  // An invoice with several vehicles: one fee line per vehicle, each with its
  // own CNF price. Left out, the order has the single description/total line.
  lines?: { name: string; total: number }[];
}

// Creates a WooCommerce order representing a CRM invoice — uses a fee line
// instead of a product line, since cars aren't managed as WooCommerce products.
// Orders keep their OWN billing snapshot separate from the customer profile,
// so it must be set here too, not just on the customer.
export async function createWcOrder(input: WcOrderInput): Promise<number> {
  const created = await wcFetch(`/orders`, {
    method: "POST",
    body: {
      customer_id: input.customerId,
      status: "on-hold",
      fee_lines: input.lines?.length
        ? input.lines.map((l) => ({ name: l.name, total: l.total.toFixed(2) }))
        : [{ name: input.description, total: input.total.toFixed(2) }],
      meta_data: [{ key: "crm_invoice_id", value: input.invoiceId }],
      billing: input.billing
        ? {
            first_name: input.billing.firstName,
            last_name: input.billing.lastName ?? "",
            address_1: input.billing.address ?? "",
            country: input.billing.country ?? "",
            phone: input.billing.phone ?? "",
            email: input.billing.email,
          }
        : undefined,
    },
  });
  return created.id as number;
}

// Updates an existing order's own billing snapshot (used when backfilling
// orders created before this field was populated).
export async function setWcOrderBilling(orderId: number, billing: { firstName: string; lastName?: string; phone?: string; address?: string; country?: string; email: string }): Promise<void> {
  await wcFetch(`/orders/${orderId}`, {
    method: "PUT",
    body: {
      billing: {
        first_name: billing.firstName,
        last_name: billing.lastName ?? "",
        address_1: billing.address ?? "",
        country: billing.country ?? "",
        phone: billing.phone ?? "",
        email: billing.email,
      },
    },
  });
}

export async function addWcOrderNote(orderId: number, note: string, customerVisible = false): Promise<void> {
  await wcFetch(`/orders/${orderId}/notes`, {
    method: "POST",
    body: { note, customer_note: customerVisible },
  });
}

export async function setWcOrderStatus(orderId: number, status: "on-hold" | "processing" | "completed"): Promise<void> {
  await wcFetch(`/orders/${orderId}`, { method: "PUT", body: { status } });
}

// Best-effort: syncs an invoice to WooCommerce (customer + order) and stores
// the resulting IDs back on the invoice row. Never throws — a WooCommerce
// outage must not block invoice creation in the CRM.
export async function syncInvoiceToWooCommerce(invoiceId: string): Promise<void> {
  try {
    const invoice = await queryOne<{
      id: string;
      cnf_price: string;
      unit: string;
      chassis_no: string;
      consignee_name: string;
      consignee_address: string;
      lead_email: string | null;
      lead_phone: string;
      lead_country: string;
    }>(
      `SELECT i.id, i.cnf_price, i.unit, i.chassis_no, i.consignee_name, i.consignee_address,
              l.email AS lead_email, l.phone AS lead_phone, l.country AS lead_country
       FROM invoices i JOIN leads l ON l.id = i.lead_id
       WHERE i.id = $1`,
      [invoiceId]
    );
    if (!invoice || !invoice.lead_email) return;

    // Several vehicles on one invoice: one order line per vehicle.
    const vehicles = await getInvoiceVehicles(invoiceId);
    const lines = vehicles.length > 1
      ? vehicles.map((v) => ({ name: `${v.unit} — Chassis: ${v.chassisNo}`, total: v.cnfPrice }))
      : undefined;

    const nameParts = invoice.consignee_name.trim().split(/\s+/);
    const customerId = await findOrCreateWcCustomer({
      email: invoice.lead_email,
      firstName: nameParts[0] ?? invoice.consignee_name,
      lastName: nameParts.slice(1).join(" "),
      phone: invoice.lead_phone,
      address: invoice.consignee_address,
      country: invoice.lead_country,
    });

    const orderId = await createWcOrder({
      customerId,
      description: `${invoice.unit} — Chassis: ${invoice.chassis_no}`,
      total: Number(invoice.cnf_price),
      lines,
      invoiceId: invoice.id,
      billing: {
        firstName: nameParts[0] ?? invoice.consignee_name,
        lastName: nameParts.slice(1).join(" "),
        phone: invoice.lead_phone,
        address: invoice.consignee_address,
        country: invoice.lead_country,
        email: invoice.lead_email,
      },
    });

    await query(`UPDATE invoices SET wc_customer_id = $1, wc_order_id = $2 WHERE id = $3`, [customerId, orderId, invoiceId]);
  } catch (err) {
    console.error("WooCommerce sync failed for invoice", invoiceId, err);
  }
}

// Called after a lead's email is added/edited — catches up any of that
// lead's invoices that couldn't be synced earlier because the email was
// missing. No-op for invoices that are already synced or still lack an email.
export async function syncLeadInvoicesToWooCommerce(leadId: string): Promise<void> {
  try {
    const invoices = await query<{ id: string }>(
      `SELECT i.id FROM invoices i
       JOIN leads l ON l.id = i.lead_id
       WHERE i.lead_id = $1 AND i.wc_order_id IS NULL AND l.email IS NOT NULL AND l.email <> ''`,
      [leadId]
    );
    for (const inv of invoices) {
      await syncInvoiceToWooCommerce(inv.id);
      await syncAllPaymentsToWooCommerce(inv.id);
    }
  } catch (err) {
    console.error("WooCommerce lead-email backfill sync failed for lead", leadId, err);
  }
}

function formatWcDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export interface WcPaymentInput {
  invoiceId: string;
  amountReceived: number;
  receivedDate: string;
}

// Best-effort: records ONE payment against the invoice's WooCommerce order as
// a customer-visible note — this payment's date/amount plus the running
// balance after it — and marks the order "completed" once fully paid.
export async function syncPaymentToWooCommerce(input: WcPaymentInput): Promise<void> {
  try {
    const invoice = await queryOne<{ wc_order_id: number | null; cnf_price: string }>(
      `SELECT wc_order_id, cnf_price FROM invoices WHERE id = $1`,
      [input.invoiceId]
    );
    if (!invoice || !invoice.wc_order_id) return;

    const totals = await queryOne<{ received: string }>(
      `SELECT COALESCE(SUM(amount_received), 0) AS received FROM payments WHERE invoice_id = $1`,
      [input.invoiceId]
    );
    const totalReceived = Number(totals?.received ?? 0);
    const total = Number(invoice.cnf_price);
    const balance = total - totalReceived;

    await addWcOrderNote(
      invoice.wc_order_id,
      `Payment received on ${formatWcDate(input.receivedDate)}: $${input.amountReceived.toFixed(2)}. Balance remaining: $${balance.toFixed(2)}.`,
      true
    );

    await setWcOrderStatus(invoice.wc_order_id, balance <= 0 ? "completed" : "processing");
  } catch (err) {
    console.error("WooCommerce payment sync failed for invoice", input.invoiceId, err);
  }
}

// Best-effort: replays an invoice's FULL payment history as individual
// customer-visible notes, in chronological order with a running balance.
// Used for backfilling invoices whose email arrived after some payments
// were already recorded.
export async function syncAllPaymentsToWooCommerce(invoiceId: string): Promise<void> {
  try {
    const invoice = await queryOne<{ wc_order_id: number | null; cnf_price: string }>(
      `SELECT wc_order_id, cnf_price FROM invoices WHERE id = $1`,
      [invoiceId]
    );
    if (!invoice || !invoice.wc_order_id) return;

    const payments = await query<{ amount_received: string; received_date: string }>(
      `SELECT amount_received, received_date FROM payments WHERE invoice_id = $1 ORDER BY received_date ASC`,
      [invoiceId]
    );
    if (payments.length === 0) return;

    const total = Number(invoice.cnf_price);
    let running = 0;
    for (const p of payments) {
      running += Number(p.amount_received);
      const balance = total - running;
      await addWcOrderNote(
        invoice.wc_order_id,
        `Payment received on ${formatWcDate(p.received_date)}: $${Number(p.amount_received).toFixed(2)}. Balance remaining: $${balance.toFixed(2)}.`,
        true
      );
    }

    const finalBalance = total - running;
    await setWcOrderStatus(invoice.wc_order_id, finalBalance <= 0 ? "completed" : "processing");
  } catch (err) {
    console.error("WooCommerce full-payment-history sync failed for invoice", invoiceId, err);
  }
}
