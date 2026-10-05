import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import UnitForm, { type UnitFormDefaults } from "@/components/units/UnitForm";
import { getInvoiceVehicles } from "@/lib/invoice-vehicles";
import Link from "next/link";

export default async function NewUnitPage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string; vehicle?: string }>;
}) {
  const session = await auth();
  const role = session!.user.role;

  if (!["manager", "super_admin"].includes(role)) redirect("/dashboard");

  const { invoiceId, vehicle } = await searchParams;
  if (!invoiceId) redirect("/invoices");

  // Several vehicles on the invoice: "Add Unit" opens for the next vehicle
  // without a unit, with that vehicle's details already filled in.
  let defaults: UnitFormDefaults | undefined;
  let subtitle = "Enter vehicle details for this payment";
  const position = Number(vehicle);
  if (Number.isInteger(position) && position >= 1) {
    try {
      const vehicles = await getInvoiceVehicles(invoiceId);
      const v = vehicles[position - 1];
      if (v) {
        const words = v.unit.split(/\s+/).filter(Boolean);
        const year = (v.year.match(/\b(19|20)\d{2}\b/) ?? [])[0];
        defaults = {
          make: words[0] ?? "",
          carModel: words.slice(1).join(" "),
          year: year ?? undefined,
          color: v.color,
          chassis: v.chassisNo,
        };
        subtitle = `Vehicle ${position} of ${vehicles.length}${v.unit ? ` — ${v.unit}` : ""}`;
      }
    } catch {
      defaults = undefined;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px", background: "#f6f8fa" }}>
        <Link
          href={`/invoices/${invoiceId}`}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            fontSize: "13px", fontWeight: 500, color: "#656d76", textDecoration: "none",
            alignSelf: "flex-start",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Invoice
        </Link>

        <div style={{ background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{
            padding: "16px 24px", borderBottom: "1px solid #d0d7de",
            background: "linear-gradient(135deg, #f6f8fa 0%, #eff6ff 100%)",
          }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1f2328" }}>Add Unit</h2>
            <p style={{ fontSize: "12px", color: "#8c959f", marginTop: "2px" }}>{subtitle}</p>
          </div>
          <div style={{ padding: "24px" }}>
            <UnitForm invoiceId={invoiceId} defaults={defaults} />
          </div>
        </div>
      </div>
    </div>
  );
}
