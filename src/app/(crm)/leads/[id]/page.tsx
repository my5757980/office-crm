import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/db";
import Lead from "@/models/Lead";
import Message from "@/models/Message";
import User from "@/models/User";
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

  await dbConnect();

  const lead = await Lead.findById(id).populate("createdBy", "name email").lean();
  if (!lead) notFound();

  const role = session!.user.role;
  const canViewAll = ["admin", "manager", "super_admin"].includes(role);
  const isOwner    = (lead.createdBy as { _id: { toString(): string } })._id.toString() === session!.user.id;

  if (!canViewAll && !isOwner) notFound();

  const canEdit           = role === "super_admin";
  const canChangeStatus   = ["super_admin", "manager"].includes(role);
  const canDelete         = ["manager", "admin"].includes(role);
  const canRequestInvoice = role === "user" && isOwner;
  const canReassign       = ["super_admin", "manager"].includes(role);

  const [messages, agents] = await Promise.all([
    Message.find({ leadId: id }).sort({ createdAt: 1 }).lean(),
    canReassign ? User.find({ role: "user" }, "name email").sort({ name: 1 }).lean() : Promise.resolve([]),
  ]);

  const leadData     = JSON.parse(JSON.stringify(lead));
  const messagesData = JSON.parse(JSON.stringify(messages));
  const agentsData   = JSON.parse(JSON.stringify(agents));

  const backHref = lead.isCustomer ? "/dashboard?tab=customers" : "/dashboard";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px", background: "#f6f8fa" }}>
        <Link
          href={backHref}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            fontSize: "13px", fontWeight: 500, color: "#656d76", textDecoration: "none",
            transition: "color 150ms",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          {lead.isCustomer ? "Back to Customers" : "Back to Dashboard"}
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
