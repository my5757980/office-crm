import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/pg";
import { serializeLead, serializeMessage } from "@/lib/serialize";
import LeadDetail from "@/components/leads/LeadDetail";
import LeadChat from "@/components/leads/LeadChat";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const row = await queryOne<Record<string, unknown>>(
    `SELECT l.*, u.name AS created_by_name, u.email AS created_by_email FROM leads l LEFT JOIN users u ON u.id = l.created_by WHERE l.id = $1`,
    [id]
  );
  if (!row) notFound();

  const role = session!.user.role;
  const canViewAll = ["admin", "manager", "super_admin"].includes(role);
  const isOwner    = row.created_by === session!.user.id;

  if (!canViewAll && !isOwner) notFound();

  const canEdit           = ["super_admin", "manager"].includes(role);
  const canChangeStatus   = ["super_admin", "manager"].includes(role);
  const canDelete         = ["manager", "admin"].includes(role);
  const canRequestInvoice = role === "user" && isOwner;
  const canReassign       = ["super_admin", "manager"].includes(role);

  const [messageRows, agentRows] = await Promise.all([
    query(`SELECT * FROM messages WHERE lead_id = $1 ORDER BY created_at ASC`, [id]),
    canReassign ? query(`SELECT id, name, email FROM users WHERE role = 'user' ORDER BY name ASC`) : Promise.resolve([]),
  ]);

  const leadData     = serializeLead(row);
  const messagesData = messageRows.map(serializeMessage);
  const agentsData   = agentRows.map((a: Record<string, unknown>) => ({ _id: a.id as string, name: a.name as string, email: a.email as string }));

  const backHref = row.is_customer ? "/dashboard?tab=customers" : "/dashboard";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px", background: "#f6f8fa" }}>
        <Link
          href={backHref}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            fontSize: "13px", fontWeight: 500, color: "#656d76", textDecoration: "none",
            transition: "color 150ms", alignSelf: "flex-start",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          {row.is_customer ? "Back to Customers" : "Back to Dashboard"}
        </Link>

        <LeadDetail
          lead={leadData}
          canEdit={canEdit}
          canChangeStatus={canChangeStatus}
          canDelete={canDelete}
          canRequestInvoice={canRequestInvoice}
          canReassign={canReassign}
          agents={agentsData}
        />

        <LeadChat
          leadId={id}
          messages={messagesData}
          currentUserName={session!.user.name ?? ""}
        />
      </div>
    </div>
  );
}
