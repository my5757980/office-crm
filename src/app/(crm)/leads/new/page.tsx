"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import LeadForm from "@/components/leads/LeadForm";
import { LeadFormData } from "@/lib/validations";
import TopBar from "@/components/layout/TopBar";

interface DuplicateInfo { ownerName: string; ownerDate: string; phone: string; }

export default function NewLeadPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (session && session.user.role !== "user") {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  const handleSubmit = async (data: LeadFormData) => {
    setDuplicate(null);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.status === 409) {
      const j = await res.json();
      setDuplicate({ ownerName: j.ownerName, ownerDate: j.ownerDate, phone: j.phone });
      throw new Error("duplicate");
    }
    if (!res.ok) {
      let msg = "Failed to create lead";
      try { const j = await res.json(); msg = j.error || msg; } catch {}
      throw new Error(msg);
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <TopBar />
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #d0d7de", background: "#ffffff" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1f2328" }}>New Lead</h1>
        <p style={{ fontSize: "13px", color: "#656d76", marginTop: "2px" }}>Fill in the customer details to create a new lead</p>
      </div>
      <div style={{ flex: 1, padding: "24px", background: "#f6f8fa" }}>
        {duplicate && (
          <div style={{
            maxWidth: "740px",
            background: "#fff8f0", border: "1px solid #f97316",
            borderRadius: "10px", padding: "16px 20px",
            display: "flex", gap: "12px", alignItems: "flex-start",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#c2410c", marginBottom: "4px" }}>
                Ye client pehle se registered hai
              </p>
              <p style={{ fontSize: "13px", color: "#7c2d12" }}>
                Phone <strong>{duplicate.phone}</strong> pehle se <strong>{duplicate.ownerName}</strong> ke paas hai — added on {duplicate.ownerDate}.
              </p>
              <p style={{ fontSize: "12px", color: "#9a3412", marginTop: "6px" }}>
                Supervisor ko notify kar diya gaya hai. Apne supervisor se baat karo reassignment ke liye.
              </p>
            </div>
          </div>
        )}

        <div style={{
          maxWidth: "740px",
          background: "#ffffff", border: "1px solid #d0d7de",
          borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          padding: "24px",
        }}>
          <LeadForm onSubmit={handleSubmit} submitLabel="Create Lead" />
        </div>
      </div>
    </div>
  );
}
