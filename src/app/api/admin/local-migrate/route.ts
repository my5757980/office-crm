import { NextRequest, NextResponse } from "next/server";
import { query as neonQuery } from "@/lib/pg";
import { localQuery } from "@/lib/localPg";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id character varying(24) NOT NULL,
    from_user character varying(24) NOT NULL,
    to_user character varying(24) NOT NULL,
    text text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.invoices (
    id character varying(24) NOT NULL,
    lead_id character varying(24) NOT NULL,
    created_by character varying(24) NOT NULL,
    approved_by character varying(24),
    consignee_name text NOT NULL,
    consignee_address text DEFAULT ''::text,
    consignee_phone text NOT NULL,
    consignee_country text NOT NULL,
    consignee_port text NOT NULL,
    unit text NOT NULL,
    chassis_no text NOT NULL,
    engine_no text NOT NULL,
    color text NOT NULL,
    year text DEFAULT ''::text,
    salesperson text DEFAULT ''::text,
    fuel text DEFAULT ''::text,
    transmission text DEFAULT ''::text,
    m3_rate numeric NOT NULL,
    exchange_rate numeric NOT NULL,
    push_price numeric NOT NULL,
    cnf_price numeric NOT NULL,
    advance_percent numeric DEFAULT 50 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    rejection_note text,
    uploaded_pdf_data text,
    uploaded_pdf_filename text,
    uploaded_pdf_uploaded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoices_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'sent'::text])))
);
CREATE TABLE IF NOT EXISTS public.leads (
    id character varying(24) NOT NULL,
    customer_name text DEFAULT ''::text,
    contact_person text DEFAULT ''::text,
    address text,
    phone text NOT NULL,
    email text,
    country text NOT NULL,
    country_code text NOT NULL,
    port text DEFAULT ''::text,
    status text DEFAULT 'new'::text NOT NULL,
    is_customer boolean DEFAULT false NOT NULL,
    created_by character varying(24) NOT NULL,
    duplicate_attempt_by character varying(24),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT leads_status_check CHECK ((status = ANY (ARRAY['new'::text, 'in_progress'::text, 'closed'::text, 'invoice_requested'::text, 'invoiced'::text])))
);
CREATE TABLE IF NOT EXISTS public.messages (
    id character varying(24) NOT NULL,
    lead_id character varying(24) NOT NULL,
    user_id character varying(24) NOT NULL,
    user_name text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.notifications (
    id character varying(24) NOT NULL,
    user_id character varying(24) NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    invoice_id character varying(24),
    lead_id character varying(24),
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['invoice_requested'::text, 'invoice_approved'::text, 'invoice_rejected'::text, 'duplicate_lead'::text])))
);
CREATE TABLE IF NOT EXISTS public.payments (
    id character varying(24) NOT NULL,
    invoice_id character varying(24) NOT NULL,
    selling_price numeric NOT NULL,
    amount_received numeric NOT NULL,
    received_date timestamp with time zone NOT NULL,
    exchange_rate numeric,
    yen_amount numeric,
    recorded_by character varying(24) NOT NULL,
    receipt_image_data text,
    receipt_image_filename text,
    receipt_image_uploaded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.unit_files (
    id character varying(24) NOT NULL,
    unit_id character varying(24) NOT NULL,
    folder text NOT NULL,
    filename text NOT NULL,
    mimetype text NOT NULL,
    size integer NOT NULL,
    data bytea NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.unit_financials (
    id character varying(24) NOT NULL,
    unit_id character varying(24) NOT NULL,
    currency text NOT NULL,
    lot_no text DEFAULT ''::text,
    auction_name text DEFAULT ''::text,
    buying numeric DEFAULT 0,
    domestic numeric DEFAULT 0,
    storage numeric DEFAULT 0,
    inspect numeric DEFAULT 0,
    repairs numeric DEFAULT 0,
    misc numeric DEFAULT 0,
    agency_fee numeric DEFAULT 0,
    freight numeric DEFAULT 0,
    dhl numeric DEFAULT 0,
    exchange_rate numeric DEFAULT 0,
    cost_usd numeric DEFAULT 0,
    cost_of_unit_jpy numeric DEFAULT 0,
    cost_of_unit_usd numeric DEFAULT 0,
    selling_price numeric DEFAULT 0,
    profit numeric DEFAULT 0,
    created_by character varying(24) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT unit_financials_currency_check CHECK ((currency = ANY (ARRAY['JPY'::text, 'USD'::text])))
);
CREATE TABLE IF NOT EXISTS public.units (
    id character varying(24) NOT NULL,
    payment_id character varying(24),
    invoice_id character varying(24) NOT NULL,
    make text NOT NULL,
    car_model text NOT NULL,
    year integer NOT NULL,
    color text NOT NULL,
    chassis text NOT NULL,
    engine_cc integer NOT NULL,
    drive text NOT NULL,
    fuel text NOT NULL,
    mileage integer NOT NULL,
    transmission text NOT NULL,
    steering text NOT NULL,
    doors integer NOT NULL,
    seats integer NOT NULL,
    location text NOT NULL,
    created_by character varying(24) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.users (
    id character varying(24) NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_seen timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text, 'manager'::text, 'super_admin'::text])))
);
ALTER TABLE ONLY public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_pkey;
ALTER TABLE ONLY public.chat_messages ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_pkey;
ALTER TABLE ONLY public.invoices ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.leads DROP CONSTRAINT IF EXISTS leads_pkey;
ALTER TABLE ONLY public.leads ADD CONSTRAINT leads_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE ONLY public.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE ONLY public.payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.unit_files DROP CONSTRAINT IF EXISTS unit_files_pkey;
ALTER TABLE ONLY public.unit_files ADD CONSTRAINT unit_files_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.unit_financials DROP CONSTRAINT IF EXISTS unit_financials_pkey;
ALTER TABLE ONLY public.unit_financials ADD CONSTRAINT unit_financials_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.unit_financials DROP CONSTRAINT IF EXISTS unit_financials_unit_id_key;
ALTER TABLE ONLY public.unit_financials ADD CONSTRAINT unit_financials_unit_id_key UNIQUE (unit_id);
ALTER TABLE ONLY public.units DROP CONSTRAINT IF EXISTS units_pkey;
ALTER TABLE ONLY public.units ADD CONSTRAINT units_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_from_to ON public.chat_messages USING btree (from_user, to_user, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_to_read ON public.chat_messages USING btree (to_user, read);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON public.invoices USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_lead_id ON public.invoices USING btree (lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_country ON public.leads USING btree (country);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON public.leads USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON public.messages USING btree (lead_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments USING btree (invoice_id);
CREATE INDEX IF NOT EXISTS idx_unit_files_unit_id ON public.unit_files USING btree (unit_id);
CREATE INDEX IF NOT EXISTS idx_units_invoice_id ON public.units USING btree (invoice_id);
CREATE INDEX IF NOT EXISTS idx_units_payment_id ON public.units USING btree (payment_id);
ALTER TABLE ONLY public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_from_user_fkey;
ALTER TABLE ONLY public.chat_messages ADD CONSTRAINT chat_messages_from_user_fkey FOREIGN KEY (from_user) REFERENCES public.users(id);
ALTER TABLE ONLY public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_to_user_fkey;
ALTER TABLE ONLY public.chat_messages ADD CONSTRAINT chat_messages_to_user_fkey FOREIGN KEY (to_user) REFERENCES public.users(id);
ALTER TABLE ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_approved_by_fkey;
ALTER TABLE ONLY public.invoices ADD CONSTRAINT invoices_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_created_by_fkey;
ALTER TABLE ONLY public.invoices ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_lead_id_fkey;
ALTER TABLE ONLY public.invoices ADD CONSTRAINT invoices_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);
ALTER TABLE ONLY public.leads DROP CONSTRAINT IF EXISTS leads_created_by_fkey;
ALTER TABLE ONLY public.leads ADD CONSTRAINT leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.leads DROP CONSTRAINT IF EXISTS leads_duplicate_attempt_by_fkey;
ALTER TABLE ONLY public.leads ADD CONSTRAINT leads_duplicate_attempt_by_fkey FOREIGN KEY (duplicate_attempt_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.messages DROP CONSTRAINT IF EXISTS messages_lead_id_fkey;
ALTER TABLE ONLY public.messages ADD CONSTRAINT messages_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);
ALTER TABLE ONLY public.messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;
ALTER TABLE ONLY public.messages ADD CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_invoice_id_fkey;
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);
ALTER TABLE ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_lead_id_fkey;
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);
ALTER TABLE ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.payments DROP CONSTRAINT IF EXISTS payments_invoice_id_fkey;
ALTER TABLE ONLY public.payments ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);
ALTER TABLE ONLY public.payments DROP CONSTRAINT IF EXISTS payments_recorded_by_fkey;
ALTER TABLE ONLY public.payments ADD CONSTRAINT payments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.unit_files DROP CONSTRAINT IF EXISTS unit_files_unit_id_fkey;
ALTER TABLE ONLY public.unit_files ADD CONSTRAINT unit_files_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);
ALTER TABLE ONLY public.unit_financials DROP CONSTRAINT IF EXISTS unit_financials_created_by_fkey;
ALTER TABLE ONLY public.unit_financials ADD CONSTRAINT unit_financials_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.unit_financials DROP CONSTRAINT IF EXISTS unit_financials_unit_id_fkey;
ALTER TABLE ONLY public.unit_financials ADD CONSTRAINT unit_financials_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);
ALTER TABLE ONLY public.units DROP CONSTRAINT IF EXISTS units_created_by_fkey;
ALTER TABLE ONLY public.units ADD CONSTRAINT units_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.units DROP CONSTRAINT IF EXISTS units_invoice_id_fkey;
ALTER TABLE ONLY public.units ADD CONSTRAINT units_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);
ALTER TABLE ONLY public.units DROP CONSTRAINT IF EXISTS units_payment_id_fkey;
ALTER TABLE ONLY public.units ADD CONSTRAINT units_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);
`;

const TABLE_COLUMNS: Record<string, string[]> = {
  users: ["id", "name", "email", "password", "role", "is_active", "last_seen", "created_at", "updated_at"],
  leads: ["id", "customer_name", "contact_person", "address", "phone", "email", "country", "country_code", "port", "status", "is_customer", "created_by", "duplicate_attempt_by", "created_at", "updated_at"],
  invoices: ["id", "lead_id", "created_by", "approved_by", "consignee_name", "consignee_address", "consignee_phone", "consignee_country", "consignee_port", "unit", "chassis_no", "engine_no", "color", "year", "salesperson", "fuel", "transmission", "m3_rate", "exchange_rate", "push_price", "cnf_price", "advance_percent", "status", "rejection_note", "uploaded_pdf_data", "uploaded_pdf_filename", "uploaded_pdf_uploaded_at", "created_at", "updated_at"],
  payments: ["id", "invoice_id", "selling_price", "amount_received", "received_date", "exchange_rate", "yen_amount", "recorded_by", "receipt_image_data", "receipt_image_filename", "receipt_image_uploaded_at", "created_at"],
  units: ["id", "payment_id", "invoice_id", "make", "car_model", "year", "color", "chassis", "engine_cc", "drive", "fuel", "mileage", "transmission", "steering", "doors", "seats", "location", "created_by", "created_at"],
  unit_financials: ["id", "unit_id", "currency", "lot_no", "auction_name", "buying", "domestic", "storage", "inspect", "repairs", "misc", "agency_fee", "freight", "dhl", "exchange_rate", "cost_usd", "cost_of_unit_jpy", "cost_of_unit_usd", "selling_price", "profit", "created_by", "updated_at"],
  unit_files: ["id", "unit_id", "folder", "filename", "mimetype", "size", "data", "uploaded_at"],
  notifications: ["id", "user_id", "message", "type", "invoice_id", "lead_id", "read", "created_at"],
  messages: ["id", "lead_id", "user_id", "user_name", "message", "created_at"],
  chat_messages: ["id", "from_user", "to_user", "text", "read", "created_at"],
};

function checkAuth(req: NextRequest): boolean {
  const secret = req.headers.get("x-migrate-secret");
  return !!secret && !!process.env.MIGRATE_SECRET && secret === process.env.MIGRATE_SECRET;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (body.action === "schema") {
      await localQuery(SCHEMA_SQL);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "copy") {
      const { table, offset, limit } = body as { table: string; offset: number; limit: number };
      const cols = TABLE_COLUMNS[table];
      if (!cols) return NextResponse.json({ error: "unknown table" }, { status: 400 });

      const rows = await neonQuery<Record<string, unknown>>(
        `SELECT ${cols.join(",")} FROM ${table} ORDER BY id LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const placeholders = cols.map((_, i) => `$${i + 1}`).join(",");
      let inserted = 0;
      for (const row of rows) {
        const values = cols.map((c) => row[c]);
        await localQuery(
          `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
          values
        );
        inserted++;
      }

      return NextResponse.json({ ok: true, rowsRead: rows.length, inserted });
    }

    if (body.action === "count") {
      const { table } = body as { table: string };
      if (!TABLE_COLUMNS[table]) return NextResponse.json({ error: "unknown table" }, { status: 400 });
      const r = await localQuery<{ count: string }>(`SELECT count(*) FROM ${table}`);
      return NextResponse.json({ table, count: Number(r[0].count) });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json({ error: message, stack }, { status: 500 });
  }
}
