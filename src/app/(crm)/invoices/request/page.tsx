"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import InvoiceRequestForm from "@/components/invoices/InvoiceRequestForm";
import { InvoiceRequestFormData } from "@/lib/validations";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";

interface LeadData {
  _id: string;
  customerName: string;
  address: string;
  phone: string;
  country: string;
  port: string;
  status: string;
  isCustomer?: boolean;
}

export default function InvoiceRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  const { data: session, status } = useSession();
  const [lead, setLead] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "user") { router.replace("/dashboard"); return; }
    if (!leadId) { setError("No lead specified."); setLoading(false); return; }
    fetch(`/api/leads/${leadId}`)
      .then((r) => r.json())
      .then(({ lead: l }) => {
        if (!l) { setError("Lead not found."); return; }
        if (l.status === "closed" && !l.isCustomer) { setError("Cannot request invoice for a closed lead."); return; }
        setLead(l);
      })
      .catch(() => setError("Failed to load lead."))
      .finally(() => setLoading(false));
  }, [leadId, session, status, router]);

  const handleSubmit = async (data: InvoiceRequestFormData) => {
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to submit invoice request");
    router.push("/invoices");
    router.refresh();
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#8c959f", fontSize: "13px" }}>
          <svg style={{ animation: "spin 1s linear infinite" }} width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading…
        </div>
      </div>
    </div>
  );

  if (error || !lead) return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{
          background: "#ffffff", border: "1px solid #d0d7de", borderRadius: "10px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          padding: "32px", maxWidth: "360px", width: "100%", textAlign: "center",
        }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "10px",
            background: "#ffebe9", display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cf222e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#1f2328", marginBottom: "6px" }}>Unable to load</p>
          <p style={{ fontSize: "13px", color: "#656d76", marginBottom: "20px" }}>{error || "Lead not found."}</p>
          <button
            onClick={() => router.back()}
            style={{ fontSize: "13px", fontWeight: 600, color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}
          >
            ← Go back
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <Link href={`/leads/${lead._id}`} style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          fontSize: "13px", fontWeight: 500, color: "#656d76", textDecoration: "none",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Lead
        </Link>

        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1f2328" }}>Request Invoice</h1>
          <p style={{ fontSize: "13px", color: "#656d76", marginTop: "2px" }}>
            Customer: <strong style={{ color: "#1f2328" }}>{lead.customerName}</strong>
          </p>
        </div>

        <div style={{
          maxWidth: "740px",
          background: "#ffffff", border: "1px solid #d0d7de",
          borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          padding: "24px",
        }}>
          <InvoiceRequestForm
            leadId={lead._id}
            defaultConsignee={{
              name:    lead.customerName,
              address: lead.address ?? "",
              phone:   lead.phone,
              country: lead.country,
              port:    lead.port,
            }}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
