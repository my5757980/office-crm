import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { query } from "@/lib/pg";
import { serializeUnit } from "@/lib/serialize";
import TopBar from "@/components/layout/TopBar";
import UnitsTable from "@/components/units/UnitsTable";

export default async function UnitsPage() {
  const session = await auth();
  const role = session!.user.role;
  if (!["user", "manager", "super_admin"].includes(role)) redirect("/dashboard");

  let unitsData: ReturnType<typeof serializeUnit>[] = [];
  const coverMap: Record<string, string> = {};
  const profitMap: Record<string, number | null> = {};

  try {
    const rows = role === "user"
      ? await query(
          `SELECT un.*, u.name AS created_by_name FROM units un
           LEFT JOIN users u ON u.id = un.created_by
           WHERE un.invoice_id IN (SELECT id FROM invoices WHERE created_by = $1)
           ORDER BY un.created_at DESC`,
          [session!.user.id]
        )
      : await query(
          `SELECT un.*, u.name AS created_by_name FROM units un LEFT JOIN users u ON u.id = un.created_by ORDER BY un.created_at DESC`
        );

    const unitIds = rows.map((u: Record<string, unknown>) => u.id as string);

    const coverFiles = unitIds.length > 0
      ? await query<{ unit_id: string; id: string; uploaded_at: string | null }>(
          `SELECT unit_id, id, uploaded_at FROM unit_files WHERE unit_id = ANY($1) AND mimetype LIKE 'image/%' ORDER BY uploaded_at ASC`,
          [unitIds]
        )
      : [];

    let financials: { unit_id: string; profit: string }[] = [];
    if (role === "manager" && unitIds.length > 0) {
      financials = await query<{ unit_id: string; profit: string }>(
        `SELECT unit_id, profit FROM unit_financials WHERE unit_id = ANY($1)`,
        [unitIds]
      );
    }

    for (const f of coverFiles) {
      if (!f.unit_id) continue;
      if (!coverMap[f.unit_id]) coverMap[f.unit_id] = f.id;
    }
    for (const f of financials) {
      if (!f.unit_id) continue;
      profitMap[f.unit_id] = Number(f.profit);
    }

    unitsData = rows.map(serializeUnit);
  } catch (err) {
    console.error("Units page query failed:", err);
    unitsData = [];
  }

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
            <UnitsTable units={unitsData} coverMap={coverMap} profitMap={profitMap} role={role} />
          </div>
        )}
      </div>
    </div>
  );
}
