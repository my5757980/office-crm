"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { leadSchema, LeadFormData } from "@/lib/validations";
import countriesPorts from "@/data/countries_ports.json";

const countryList = Object.keys(countriesPorts as Record<string, { code: string; ports: string[] }>).sort();

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d0d7de",
  borderRadius: "8px",
  fontSize: "13px",
  color: "#1f2328",
  background: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 150ms, box-shadow 150ms",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "#1f2328",
  marginBottom: "5px",
};

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>
        {label} {required && <span style={{ color: "#cf222e" }}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{ fontSize: "11px", color: "#cf222e", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

function withFocus(style: React.CSSProperties) {
  return {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      e.target.style.borderColor = "#2563eb";
      e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)";
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      e.target.style.borderColor = style.borderColor as string ?? "#d0d7de";
      e.target.style.boxShadow = "none";
    },
  };
}

export default function LeadForm({ defaultValues, onSubmit, submitLabel = "Save Lead" }: {
  defaultValues?: Partial<LeadFormData>;
  onSubmit: (data: LeadFormData) => Promise<void>;
  submitLabel?: string;
}) {
  const [portLocked, setPortLocked] = useState(false);
  const [ports, setPorts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: { customerName: "", contactPerson: "", address: "", phone: "", email: "", country: "", countryCode: "", port: "", ...defaultValues },
  });

  const selectedCountry = watch("country");

  useEffect(() => {
    if (!selectedCountry) { setPorts([]); setPortLocked(false); return; }
    const data = (countriesPorts as Record<string, { code: string; ports: string[] }>)[selectedCountry];
    if (!data) return;
    setValue("countryCode", data.code);
    const cp = data.ports ?? [];
    setPorts(cp);
    if (cp.length === 1) { setValue("port", cp[0]); setPortLocked(true); }
    else { setValue("port", ""); setPortLocked(false); }
  }, [selectedCountry, setValue]);

  const handleFormSubmit = async (data: LeadFormData) => {
    setError("");
    setLoading(true);
    try { await onSubmit(data); }
    catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Field label="Customer / Business Name" error={errors.customerName?.message}>
          <input {...register("customerName")} style={inputStyle} placeholder="Acme Trading Co." {...withFocus(inputStyle)} />
        </Field>
        <Field label="Contact Person" required error={errors.contactPerson?.message}>
          <input {...register("contactPerson")} style={inputStyle} placeholder="John Smith" {...withFocus(inputStyle)} />
        </Field>
        <Field label="Phone Number" required error={errors.phone?.message}>
          <input {...register("phone")} type="tel" style={inputStyle} placeholder="+1 234 567 8900" {...withFocus(inputStyle)} />
        </Field>
        <Field label="Email Address" error={errors.email?.message}>
          <input {...register("email")} type="email" style={inputStyle} placeholder="contact@company.com" {...withFocus(inputStyle)} />
        </Field>
        <div style={{ gridColumn: "span 2" }}>
          <Field label="Address">
            <input {...register("address")} style={inputStyle} placeholder="123 Main St, City" {...withFocus(inputStyle)} />
          </Field>
        </div>
        <Field label="Country" required error={errors.country?.message}>
          <select {...register("country")} style={inputStyle} {...withFocus(inputStyle)}>
            <option value="">Select country…</option>
            {countryList.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <input type="hidden" {...register("countryCode")} />
        <Field label="Port" required error={errors.port?.message}>
          {portLocked ? (
            <input value={ports[0] ?? ""} readOnly style={{ ...inputStyle, background: "#f6f8fa", color: "#656d76", cursor: "not-allowed" }} />
          ) : (
            <select {...register("port")} disabled={ports.length === 0} style={{ ...inputStyle, background: ports.length === 0 ? "#f6f8fa" : "#ffffff", color: ports.length === 0 ? "#8c959f" : "#1f2328" }} {...withFocus(inputStyle)}>
              <option value="">{ports.length === 0 ? "Select country first…" : "Select port…"}</option>
              {ports.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </Field>
      </div>

      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: "#ffebe9", border: "1px solid #ffcecb",
          color: "#cf222e", fontSize: "12px",
          borderRadius: "8px", padding: "10px 14px",
          marginTop: "16px",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "20px" }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "9px 20px", borderRadius: "8px",
            fontSize: "13px", fontWeight: 600,
            color: "white",
            background: loading ? "#6b7280" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
            border: "none", cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
            opacity: loading ? 0.7 : 1,
            transition: "all 150ms",
          }}
        >
          {loading ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
