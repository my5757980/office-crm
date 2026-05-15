import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/db";
import Unit from "@/models/Unit";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";

export default async function UnitsPage() {
  const session = await auth();
  const role = session!.user.role;
  if (!["manager", "super_admin"].includes(role)) redirect("/dashboard");

  await dbConnect();

  const units = await Unit.find({})
    .populate("invoiceId", "cnfPrice")
    .populate("createdBy", "name")
    .sort({ createdAt: -1 })
    .lean();

  const unitsData = JSON.parse(JSON.stringify(units));

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px", background: "#f6f8fa" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1f2328" }}>Unit Repository</h1>
            <p style={{ fontSize: "13px", color: "#8c959f", marginTop: "2px" }}>{unitsData.length} unit{unitsData.length !== 1 ? "s" : ""} total</p>
          </div>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          {unitsData.length === 0 ? (
            <div style={{ padding: "64px", textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🚗</div>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#1f2328" }}>No units yet</p>
              <p style={{ fontSize: "13px", color: "#8c959f", marginTop: "4px" }}>Units appear here after being added against a payment</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f6f8fa", borderBottom: "1px solid #d0d7de" }}>
                  {["Vehicle", "Chassis", "Color", "Drive / Fuel", "Mileage", "Location", "Added By", ""].map(h => (
                    <th key={h} style={{ padding: "10px 16px", fontSize: "11px", fontWeight: 700, color: "#656d76", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unitsData.map((u: {
                  _id: string; make: string; carModel: string; year: number;
                  chassis: string; color: string; drive: string; fuel: string;
                  mileage: number; location: string; createdBy?: { name: string };
                }, i: number) => (
                  <tr key={u._id} style={{ borderBottom: i < unitsData.length - 1 ? "1px solid #f0f2f4" : "none" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
                          background: "linear-gradient(135deg, #059669, #047857)",
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px",
                        }}>🚗</div>
                        <div>
                          <p style={{ fontWeight: 600, color: "#1f2328" }}>{u.year} {u.make} {u.carModel}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#656d76", fontFamily: "monospace", fontSize: "12px" }}>{u.chassis}</td>
                    <td style={{ padding: "12px 16px", color: "#656d76" }}>{u.color}</td>
                    <td style={{ padding: "12px 16px", color: "#656d76" }}>{u.drive} · {u.fuel}</td>
                    <td style={{ padding: "12px 16px", color: "#656d76" }}>{u.mileage.toLocaleString()} km</td>
                    <td style={{ padding: "12px 16px", color: "#656d76" }}>{u.location}</td>
                    <td style={{ padding: "12px 16px", color: "#8c959f", fontSize: "12px" }}>{u.createdBy?.name ?? "—"}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <Link href={`/units/${u._id}`} style={{
                        fontSize: "11px", fontWeight: 600, padding: "5px 12px", borderRadius: "6px",
                        background: "#eff6ff", color: "#2563eb", textDecoration: "none",
                        border: "1px solid #bfdbfe",
                      }}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
