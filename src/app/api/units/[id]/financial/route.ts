import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Unit from "@/models/Unit";
import Invoice from "@/models/Invoice";
import UnitFinancial from "@/models/UnitFinancial";

type RouteContext = { params: Promise<{ id: string }> };

const CAN_EDIT = ["manager"];

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_EDIT.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const { id } = await params;

  const unit = await Unit.findById(id).select("invoiceId").lean();
  if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

  const [invoice, financial] = await Promise.all([
    Invoice.findById(unit.invoiceId).select("cnfPrice").lean(),
    UnitFinancial.findOne({ unitId: id }).lean(),
  ]);

  return NextResponse.json({
    financial: financial ? JSON.parse(JSON.stringify(financial)) : null,
    sellingPrice: invoice?.cnfPrice ?? 0,
  });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CAN_EDIT.includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await dbConnect();
  const { id } = await params;
  const body = await request.json();

  const unit = await Unit.findById(id).select("invoiceId").lean();
  if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

  const invoice = await Invoice.findById(unit.invoiceId).select("cnfPrice").lean();
  const sellingPrice = invoice?.cnfPrice ?? 0;

  const currency: "JPY" | "USD" = body.currency === "USD" ? "USD" : "JPY";

  let costOfUnitJPY = 0;
  let costOfUnitUSD = 0;

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

    costOfUnitJPY = buying + domestic + storage + inspect + repairs + misc + agencyFee + freight + dhl;
    costOfUnitUSD = exchangeRate > 0 ? costOfUnitJPY / exchangeRate : 0;

    const profit = sellingPrice - costOfUnitUSD;

    const record = await UnitFinancial.findOneAndUpdate(
      { unitId: id },
      {
        unitId: id, currency,
        lotNo, auctionName,
        buying, domestic, storage, inspect, repairs, misc, agencyFee, freight, dhl,
        exchangeRate, costUSD: 0,
        costOfUnitJPY, costOfUnitUSD,
        sellingPrice, profit,
        createdBy: session.user.id,
      },
      { upsert: true, new: true }
    );
    return NextResponse.json({ financial: record });
  } else {
    const costUSD  = Number(body.costUSD) || 0;
    costOfUnitUSD  = costUSD;
    const profit   = sellingPrice - costUSD;

    const record = await UnitFinancial.findOneAndUpdate(
      { unitId: id },
      {
        unitId: id, currency,
        buying: 0, domestic: 0, storage: 0, inspect: 0, repairs: 0,
        misc: 0, agencyFee: 0, freight: 0, dhl: 0, exchangeRate: 0,
        costUSD, costOfUnitJPY: 0, costOfUnitUSD,
        sellingPrice, profit,
        createdBy: session.user.id,
      },
      { upsert: true, new: true }
    );
    return NextResponse.json({ financial: record });
  }
}
