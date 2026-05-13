"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import LeadForm from "@/components/leads/LeadForm";
import { LeadFormData } from "@/lib/validations";
import TopBar from "@/components/layout/TopBar";

const CAN_EDIT = ["super_admin"];

export default function EditLeadPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { data: session, status } = useSession();
  const [defaultValues, setDefaultValues] = useState<Partial<LeadFormData>>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || !CAN_EDIT.includes(session.user.role)) {
      router.replace("/dashboard");
      return;
    }
    fetch(`/api/leads/${id}`)
      .then((r) => r.json())
      .then(({ lead }) => {
        setDefaultValues({
          customerName: lead.customerName,
          contactPerson: lead.contactPerson,
          address: lead.address || "",
          phone: lead.phone,
          email: lead.email || "",
          country: lead.country,
          countryCode: lead.countryCode,
          port: lead.port,
        });
        setLoading(false);
      });
  }, [id, session, status, router]);

  const handleSubmit = async (data: LeadFormData) => {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || "Failed to update lead");
    }
    router.push(`/leads/${id}`);
    router.refresh();
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#8c959f", fontSize: "13px" }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #d0d7de", background: "#ffffff" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1f2328" }}>Edit Lead</h1>
        <p style={{ fontSize: "13px", color: "#656d76", marginTop: "2px" }}>Update the customer information below</p>
      </div>
      <div style={{ flex: 1, padding: "24px", background: "#f6f8fa" }}>
        <div style={{
          maxWidth: "740px",
          background: "#ffffff", border: "1px solid #d0d7de",
          borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          padding: "24px",
        }}>
          <LeadForm defaultValues={defaultValues} onSubmit={handleSubmit} submitLabel="Update Lead" />
        </div>
      </div>
    </div>
  );
}
