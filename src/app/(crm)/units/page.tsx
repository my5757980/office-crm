import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/db";
import Unit from "@/models/Unit";
import UnitFile from "@/models/UnitFile";
import Invoice from "@/models/Invoice";
import TopBar from "@/components/layout/TopBar";
import UnitsTable from "@/components/units/UnitsTable";

export default async function UnitsPage() {
  const session = await auth();
  const role = session!.user.role;
  if (!["user", "manager", "super_admin"].includes(role)) redirect("/dashboard");

  await dbConnect();

  let units;
  if (role === "user") {
    const myInvoices = await Invoice.find({ createdBy: session!.user.id }).select("_id").lean();
    const invoiceIds = myInvoices.map(i => i._id);
    units = await Unit.find({ invoiceId: { $in: invoiceIds } })
      .populate("invoiceId", "cnfPrice")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .lean();
  } else {
    units = await Unit.find({})
      .populate("invoiceId", "cnfPrice")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .lean();
  }

  const unitIds = units.map(u => u._id);
  const coverFiles = await UnitFile.find({
    unitId: { $in: unitIds },
    mimetype: /^image\//,
  }).select("unitId _id").sort({ uploadedAt: 1 }).lean();

  const coverMap: Record<string, string> = {};
  for (const f of coverFiles) {
    const key = f.unitId.toString();
    if (!coverMap[key]) coverMap[key] = (f._id as { toString(): string }).toString();
  }

  const unitsData = JSON.parse(JSON.stringify(units));

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px", background: "#f6f8fa" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1f2328" }}>Unit Repository</h1>
          <p style={{ fontSize: "13px", color: "#8c959f", marginTop: "2px" }}>{unitsData.length} unit{unitsData.length !== 1 ? "s" : ""} total</p>
        </div>

        {unitsData.length === 0 ? (
          <div style={{ background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: "64px", textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🚗</div>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#1f2328" }}>No units yet</p>
              <p style={{ fontSize: "13px", color: "#8c959f", marginTop: "4px" }}>Units appear here after being added against an invoice</p>
            </div>
          </div>
        ) : (
          <div style={{ background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <UnitsTable units={unitsData} coverMap={coverMap} />
          </div>
        )}
      </div>
    </div>
  );
}
