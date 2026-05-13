"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoiceRequestSchema, InvoiceRequestFormData } from "@/lib/validations";

interface Props {
  leadId: string;
  defaultConsignee: { name: string; address: string; phone: string; country: string; port: string };
  onSubmit: (data: InvoiceRequestFormData) => Promise<void>;
}

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

const focusHandlers = {
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#2563eb";
    e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)";
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#d0d7de";
    e.target.style.boxShadow = "none";
  },
};

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>
        {label} {required && <span style={{ color: "#cf222e" }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: "11px", color: "#cf222e", marginTop: "4px" }}>{error}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ paddingBottom: "12px", borderBottom: "1px solid #f0f2f4", marginBottom: "16px" }}>
      <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#8c959f", textTransform: "uppercase", letterSpacing: "0.08em" }}>{children}</h3>
    </div>
  );
}

export default function InvoiceRequestForm({ leadId, defaultConsignee, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<InvoiceRequestFormData>({ resolver: zodResolver(invoiceRequestSchema) as any, defaultValues: {
    leadId,
    consignee: defaultConsignee,
    unit: "", year: "", chassisNo: "", engineNo: "", color: "",
    m3Rate: undefined, exchangeRate: undefined, pushPrice: undefined, cnfPrice: undefined,
  }});

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <input type="hidden" {...register("leadId")} />

      <section>
        <SectionTitle>Consignee Details</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <Field label="Name" required error={errors.consignee?.name?.message}>
            <input {...register("consignee.name")} style={inputStyle} placeholder="Customer / Consignee name" {...focusHandlers} />
          </Field>
          <Field label="Phone" required error={errors.consignee?.phone?.message}>
            <input {...register("consignee.phone")} style={inputStyle} placeholder="+92 300 0000000" {...focusHandlers} />
          </Field>
          <Field label="Country" required error={errors.consignee?.country?.message}>
            <input {...register("consignee.country")} style={inputStyle} placeholder="Country" {...focusHandlers} />
          </Field>
          <Field label="Port" required error={errors.consignee?.port?.message}>
            <input {...register("consignee.port")} style={inputStyle} placeholder="Destination port" {...focusHandlers} />
          </Field>
          <div style={{ gridColumn: "span 2" }}>
            <Field label="Address" error={errors.consignee?.address?.message}>
              <input {...register("consignee.address")} style={inputStyle} placeholder="Full address" {...focusHandlers} />
            </Field>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>Vehicle Details</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <Field label="Unit / Make & Model" required error={errors.unit?.message}>
            <input {...register("unit")} style={inputStyle} placeholder="e.g. Toyota Land Cruiser" {...focusHandlers} />
          </Field>
          <Field label="Year" error={errors.year?.message}>
            <input {...register("year")} style={inputStyle} placeholder="e.g. 2022" {...focusHandlers} />
          </Field>
          <Field label="Color" required error={errors.color?.message}>
            <input {...register("color")} style={inputStyle} placeholder="e.g. White" {...focusHandlers} />
          </Field>
          <Field label="Chassis Number" required error={errors.chassisNo?.message}>
            <input {...register("chassisNo")} style={inputStyle} placeholder="Chassis No." {...focusHandlers} />
          </Field>
          <Field label="Engine Number" required error={errors.engineNo?.message}>
            <input {...register("engineNo")} style={inputStyle} placeholder="Engine No." {...focusHandlers} />
          </Field>
        </div>
      </section>

      <section>
        <SectionTitle>Pricing</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <Field label="M3 Rate" required error={errors.m3Rate?.message}>
            <input {...register("m3Rate", { valueAsNumber: true })} type="number" step="0.01" style={inputStyle} placeholder="0.00" {...focusHandlers} />
          </Field>
          <Field label="Exchange Rate" required error={errors.exchangeRate?.message}>
            <input {...register("exchangeRate", { valueAsNumber: true })} type="number" step="0.01" style={inputStyle} placeholder="0.00" {...focusHandlers} />
          </Field>
          <Field label="Push Price" required error={errors.pushPrice?.message}>
            <input {...register("pushPrice", { valueAsNumber: true })} type="number" step="0.01" style={inputStyle} placeholder="0.00" {...focusHandlers} />
          </Field>
          <Field label="CNF Price" required error={errors.cnfPrice?.message}>
            <input {...register("cnfPrice", { valueAsNumber: true })} type="number" step="0.01" style={inputStyle} placeholder="0.00" {...focusHandlers} />
          </Field>
        </div>
      </section>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          width: "100%",
          padding: "11px",
          borderRadius: "8px",
          border: "none",
          fontSize: "13px", fontWeight: 700,
          color: "white",
          background: isSubmitting ? "#6b7280" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
          cursor: isSubmitting ? "not-allowed" : "pointer",
          boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
          opacity: isSubmitting ? 0.7 : 1,
          transition: "all 150ms",
        }}
      >
        {isSubmitting ? "Submitting…" : "Submit Invoice Request"}
      </button>
    </form>
  );
}
