"use client";

import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoiceRequestSchema, InvoiceRequestFormData } from "@/lib/validations";
import countriesPorts from "@/data/countries_ports.json";

type CountryData = { code: string; ports: string[] };
const cpData = countriesPorts as Record<string, CountryData>;
const countryList = Object.keys(cpData).sort();

interface Props {
  leadId: string;
  defaultConsignee: { name: string; address: string; phone: string; email: string; country: string; port: string };
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

// One empty vehicle card. Prices start undefined so a blank box stays blank.
const EMPTY_VEHICLE = {
  unit: "", year: "", color: "", chassisNo: "", engineNo: "", transmission: "", fuel: "",
  pushPrice: undefined, cnfPrice: undefined,
};

const money = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

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
    setValue,
    control,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<InvoiceRequestFormData>({ resolver: zodResolver(invoiceRequestSchema) as any, defaultValues: {
    leadId,
    consignee: defaultConsignee,
    salesperson: "",
    m3Rate: undefined, exchangeRate: undefined,
    advancePercent: 50,
    // every vehicle on the invoice — "Add More" appends another one
    vehicles: [EMPTY_VEHICLE],
  }});

  const { fields: vehicleFields, append: addVehicle, remove: removeVehicle } = useFieldArray({ control, name: "vehicles" });
  const watchedVehicles = useWatch({ control, name: "vehicles" }) ?? [];
  const totalCnf  = watchedVehicles.reduce((sum, v) => sum + money(v?.cnfPrice), 0);
  const totalPush = watchedVehicles.reduce((sum, v) => sum + money(v?.pushPrice), 0);

  const [ports, setPorts] = useState<string[]>([]);
  const [portLocked, setPortLocked] = useState(false);

  const selectedCountry = useWatch({ control, name: "consignee.country" });
  useEffect(() => {
    if (!selectedCountry) { setPorts([]); setPortLocked(false); return; }
    const data = cpData[selectedCountry];
    if (!data) { setPorts([]); setPortLocked(false); return; }
    const cp = data.ports ?? [];
    setPorts(cp);
    if (cp.length === 1) { setValue("consignee.port", cp[0]); setPortLocked(true); }
    else { setValue("consignee.port", ""); setPortLocked(false); }
  }, [selectedCountry, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <input type="hidden" {...register("leadId")} />

      <section>
        <SectionTitle>Consignee Details</SectionTitle>
        <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <Field label="Name" required error={errors.consignee?.name?.message}>
            <input {...register("consignee.name")} style={inputStyle} placeholder="Customer / Consignee name" {...focusHandlers} />
          </Field>
          <Field label="Phone" required error={errors.consignee?.phone?.message}>
            <input {...register("consignee.phone")} style={inputStyle} placeholder="+92 300 0000000" {...focusHandlers} />
          </Field>
          <Field label="Email" error={errors.consignee?.email?.message}>
            <input {...register("consignee.email")} style={inputStyle} placeholder="customer@example.com" {...focusHandlers} />
          </Field>
          <Field label="Country" required error={errors.consignee?.country?.message}>
            <select
              {...register("consignee.country")}
              style={{ ...inputStyle, cursor: "pointer" }}
              onFocus={(e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)"; }}
              onBlur={(e) => { e.target.style.borderColor = "#d0d7de"; e.target.style.boxShadow = "none"; }}
            >
              <option value="">— Select country —</option>
              {countryList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Port" error={errors.consignee?.port?.message}>
            {portLocked ? (
              <input value={ports[0] ?? ""} readOnly style={{ ...inputStyle, background: "#f6f8fa", color: "#656d76", cursor: "not-allowed" }} />
            ) : (
              <select
                {...register("consignee.port")}
                disabled={ports.length === 0}
                style={{ ...inputStyle, cursor: ports.length === 0 ? "not-allowed" : "pointer", background: ports.length === 0 ? "#f6f8fa" : "#ffffff", color: ports.length === 0 ? "#8c959f" : "#1f2328" }}
                onFocus={(e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#d0d7de"; e.target.style.boxShadow = "none"; }}
              >
                <option value="">{ports.length === 0 ? "Select country first…" : "Select port…"}</option>
                {ports.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
          </Field>
          <div className="form-span-2" style={{ gridColumn: "span 2" }}>
            <Field label="Address" error={errors.consignee?.address?.message}>
              <input {...register("consignee.address")} style={inputStyle} placeholder="Full address" {...focusHandlers} />
            </Field>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>Vehicle Details{vehicleFields.length > 1 ? ` (${vehicleFields.length} vehicles)` : ""}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {vehicleFields.map((field, i) => {
            const vErr = errors.vehicles?.[i];
            return (
              <div key={field.id} className="vehicle-card" style={{
                border: "1px solid #e5e7eb", borderRadius: "10px", padding: "14px",
                background: vehicleFields.length > 1 ? "#fbfcfd" : "#ffffff",
              }}>
                {vehicleFields.length > 1 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#1f2328" }}>Vehicle {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeVehicle(i)}
                      style={{
                        padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                        color: "#cf222e", background: "#ffebe9", border: "1px solid #ffcecb", cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <Field label="Unit / Make & Model" error={vErr?.unit?.message}>
                    <input {...register(`vehicles.${i}.unit`)} style={inputStyle} placeholder="e.g. Toyota Land Cruiser" {...focusHandlers} />
                  </Field>
                  <Field label="Year" error={vErr?.year?.message}>
                    <input {...register(`vehicles.${i}.year`)} style={inputStyle} placeholder="e.g. 2022" {...focusHandlers} />
                  </Field>
                  <Field label="Color" error={vErr?.color?.message}>
                    <input {...register(`vehicles.${i}.color`)} style={inputStyle} placeholder="e.g. White" {...focusHandlers} />
                  </Field>
                  <Field label="Chassis Number" error={vErr?.chassisNo?.message}>
                    <input {...register(`vehicles.${i}.chassisNo`)} style={inputStyle} placeholder="Chassis No." {...focusHandlers} />
                  </Field>
                  <Field label="Engine Number" error={vErr?.engineNo?.message}>
                    <input {...register(`vehicles.${i}.engineNo`)} style={inputStyle} placeholder="Engine No." {...focusHandlers} />
                  </Field>
                  <Field label="Transmission" error={vErr?.transmission?.message}>
                    <input {...register(`vehicles.${i}.transmission`)} style={inputStyle} placeholder="e.g. AT / MT" {...focusHandlers} />
                  </Field>
                  <Field label="Fuel Type" error={vErr?.fuel?.message}>
                    <input {...register(`vehicles.${i}.fuel`)} style={inputStyle} placeholder="e.g. Petrol / Diesel" {...focusHandlers} />
                  </Field>
                  <Field label="Push Price" error={vErr?.pushPrice?.message}>
                    <input {...register(`vehicles.${i}.pushPrice`, { valueAsNumber: true })} type="number" step="0.01" style={inputStyle} placeholder="0.00" {...focusHandlers} />
                  </Field>
                  <Field label="CNF Price" error={vErr?.cnfPrice?.message}>
                    <input {...register(`vehicles.${i}.cnfPrice`, { valueAsNumber: true })} type="number" step="0.01" style={inputStyle} placeholder="0.00" {...focusHandlers} />
                  </Field>
                </div>
              </div>
            );
          })}

          {errors.vehicles?.message && (
            <p style={{ fontSize: "11px", color: "#cf222e" }}>{errors.vehicles.message}</p>
          )}

          <button
            type="button"
            onClick={() => addVehicle(EMPTY_VEHICLE)}
            disabled={vehicleFields.length >= 50}
            style={{
              alignSelf: "flex-start",
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "8px 16px", borderRadius: "8px",
              fontSize: "13px", fontWeight: 600,
              color: "#2563eb", background: "#eff6ff",
              border: "1px dashed #93c5fd", cursor: "pointer",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add More
          </button>

          <Field label="Sales Person" error={errors.salesperson?.message}>
            <input {...register("salesperson")} style={inputStyle} placeholder="Sales person name" {...focusHandlers} />
          </Field>
        </div>
      </section>

      <section>
        <SectionTitle>Pricing</SectionTitle>
        <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <Field label="M3 Rate" error={errors.m3Rate?.message}>
            <input {...register("m3Rate", { valueAsNumber: true })} type="number" step="0.01" style={inputStyle} placeholder="0.00" {...focusHandlers} />
          </Field>
          <Field label="Exchange Rate" error={errors.exchangeRate?.message}>
            <input {...register("exchangeRate", { valueAsNumber: true })} type="number" step="0.01" style={inputStyle} placeholder="0.00" {...focusHandlers} />
          </Field>
          <Field label="Advance Payment %" error={errors.advancePercent?.message}>
            <input {...register("advancePercent", { valueAsNumber: true })} type="number" min="1" max="100" style={inputStyle} placeholder="e.g. 50" {...focusHandlers} />
          </Field>
        </div>
        {/* Push and CNF prices are entered per vehicle above; the invoice total is their sum */}
        <div style={{
          marginTop: "14px", padding: "12px 14px", borderRadius: "8px",
          background: "#f6f8fa", border: "1px solid #eaeef2",
          display: "flex", flexWrap: "wrap", gap: "8px 24px", fontSize: "13px", color: "#1f2328",
        }}>
          <span>Total Push Price: <strong>{totalPush.toLocaleString("en-US")}</strong></span>
          <span>Total CNF Price: <strong>{totalCnf.toLocaleString("en-US")}</strong></span>
          {vehicleFields.length > 1 && (
            <span style={{ color: "#656d76" }}>({vehicleFields.length} vehicles)</span>
          )}
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
