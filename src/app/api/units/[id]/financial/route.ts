import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne, genId } from "@/lib/pg";
import { serializeUnitFinancial } from "@/lib/serialize";

type RouteContext = { params: Promise<{ id: string }> };

const CAN_EDIT = ["manager"];

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_EDIT.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const unit = await queryOne<{ invoice_id: string }>(`SELECT invoice_id FROM units WHERE id = $1`, [id]);
  if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

  const [invoice, financial] = await Promise.all([
    queryOne<{ cnf_price: string }>(`SELECT cnf_price FROM invoices WHERE id = $1`, [unit.invoice_id]),
    queryOne<Record<string, unknown>>(`SELECT * FROM unit_financials WHERE unit_id = $1`, [id]),
  ]);

  return NextResponse.json({
    financial: financial ? serializeUnitFinancial(financial) : null,
    sellingPrice: invoice ? Number(invoice.cnf_price) : 0,
  });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_EDIT.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const unit = await queryOne<{ invoice_id: string }>(`SELECT invoice_id FROM units WHERE id = $1`, [id]);
  if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

  const invoice = await queryOne<{ cnf_price: string }>(`SELECT cnf_price FROM invoices WHERE id = $1`, [unit.invoice_id]);
  const sellingPrice = invoice ? Number(invoice.cnf_price) : 0;

  const currency: "JPY" | "USD" = body.currency === "USD" ? "USD" : "JPY";

  const upsert = async (fields: {
    lotNo: string; auctionName: string; buying: number; domestic: number; storage: number; inspect: number;
    repairs: number; misc: number; agencyFee: number; freight: number; dhl: number; exchangeRate: number;
    costUSD: number; costOfUnitJPY: number; costOfUnitUSD: number; profit: number;
  }) => {
    return queryOne<Record<string, unknown>>(
      `INSERT INTO unit_financials (id, unit_id, currency, lot_no, auction_name, buying, domestic, storage, inspect, repairs, misc, agency_fee, freight, dhl, exchange_rate, cost_usd, cost_of_unit_jpy, cost_of_unit_usd, selling_price, profit, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       ON CONFLICT (unit_id) DO UPDATE SET
         currency = EXCLUDED.currency, lot_no = EXCLUDED.lot_no, auction_name = EXCLUDED.auction_name,
         buying = EXCLUDED.buying, domestic = EXCLUDED.domestic, storage = EXCLUDED.storage, inspect = EXCLUDED.inspect,
         repairs = EXCLUDED.repairs, misc = EXCLUDED.misc, agency_fee = EXCLUDED.agency_fee, freight = EXCLUDED.freight,
         dhl = EXCLUDED.dhl, exchange_rate = EXCLUDED.exchange_rate, cost_usd = EXCLUDED.cost_usd,
         cost_of_unit_jpy = EXCLUDED.cost_of_unit_jpy, cost_of_unit_usd = EXCLUDED.cost_of_unit_usd,
         selling_price = EXCLUDED.selling_price, profit = EXCLUDED.profit, created_by = EXCLUDED.created_by, updated_at = now()
       RETURNING *`,
      [genId(), id, currency, fields.lotNo, fields.auctionName, fields.buying, fields.domestic, fields.storage, fields.inspect, fields.repairs, fields.misc, fields.agencyFee, fields.freight, fields.dhl, fields.exchangeRate, fields.costUSD, fields.costOfUnitJPY, fields.costOfUnitUSD, sellingPrice, fields.profit, session.user.id]
    );
  };

  if (currency === "JPY") {
    const lotNo      = String(body.lotNo ?? "").trim();
    const auctionName = String(body.auctionName ?? "").trim();
    const buying    = Number(body.buying)    || 0;
    const domestic  = Number(body.domestic)  || 0;
    const storage   = Number(body.storage)   || 0;
    const inspect   = Number(body.inspect)   || 0;
    const repairs   = Number(body.repairs)   || 0;
    const misc      = Number(body.misc)      || 0;
    const agencyFee = Number(body.agencyFee) || 0;
    const freight   = Number(body.freight)   || 0;
    const dhl       = Number(body.dhl)       || 0;
    const exchangeRate = Number(body.exchangeRate) || 1;

    const costOfUnitJPY = buying + domestic + storage + inspect + repairs + misc + agencyFee + freight + dhl;
    const costOfUnitUSD = exchangeRate > 0 ? costOfUnitJPY / exchangeRate : 0;
    const profit = sellingPrice - costOfUnitUSD;

    const record = await upsert({ lotNo, auctionName, buying, domestic, storage, inspect, repairs, misc, agencyFee, freight, dhl, exchangeRate, costUSD: 0, costOfUnitJPY, costOfUnitUSD, profit });
    return NextResponse.json({ financial: record ? serializeUnitFinancial(record) : null });
  } else {
    const costUSD  = Number(body.costUSD) || 0;
    const costOfUnitUSD = costUSD;
    const profit   = sellingPrice - costUSD;

    const record = await upsert({ lotNo: "", auctionName: "", buying: 0, domestic: 0, storage: 0, inspect: 0, repairs: 0, misc: 0, agencyFee: 0, freight: 0, dhl: 0, exchangeRate: 0, costUSD, costOfUnitJPY: 0, costOfUnitUSD, profit });
    return NextResponse.json({ financial: record ? serializeUnitFinancial(record) : null });
  }
}
