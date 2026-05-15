"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UnitFormProps {
  paymentId: string;
  invoiceId: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "1px solid #d0d7de", borderRadius: "8px",
  fontSize: "13px", color: "#1f2328",
  boxSizing: "border-box", outline: "none", background: "#fff",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px", fontWeight: 600, color: "#1f2328",
  display: "block", marginBottom: "4px",
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

const DRIVE        = ["2WD", "4WD", "AWD"];
const FUEL         = ["Petrol", "Diesel", "Hybrid", "Electric", "CNG"];
const TRANSMISSION = ["Automatic", "Manual", "CVT"];
const STEERING     = ["RHD", "LHD"];

export default function UnitForm({ paymentId, invoiceId }: UnitFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const [form, setForm] = useState({
    make: "", carModel: "", year: new Date().getFullYear().toString(),
    color: "", chassis: "", engineCC: "",
    drive: "4WD", fuel: "Petrol", mileage: "",
    transmission: "Automatic", steering: "RHD",
    doors: "4", seats: "5", location: "",
  });

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    setError("");
    const body = {
      paymentId,
      invoiceId,
      make:         form.make.trim(),
      carModel:     form.carModel.trim(),
      year:         parseInt(form.year),
      color:        form.color.trim(),
      chassis:      form.chassis.trim(),
      engineCC:     parseInt(form.engineCC),
      drive:        form.drive,
      fuel:         form.fuel,
      mileage:      parseInt(form.mileage),
      transmission: form.transmission,
      steering:     form.steering,
      doors:        parseInt(form.doors),
      seats:        parseInt(form.seats),
      location:     form.location.trim(),
    };

    if (!body.make || !body.carModel || !body.chassis || !body.location || isNaN(body.engineCC) || isNaN(body.mileage)) {
      setError("Please fill all required fields."); return;
    }

    setSaving(true);
    const res = await fetch("/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);

    if (res.ok) {
      const { unit } = await res.json();
      router.push(`/units/${unit._id}`);
    } else {
      const j = await res.json();
      setError(j.error ?? "Failed to create unit");
    }
  };

  const Field = ({ label, name, type = "text", placeholder = "" }: { label: string; name: string; type?: string; placeholder?: string }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type} value={(form as Record<string, string>)[name]}
        onChange={e => set(name, e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );

  const Select = ({ label, name, options }: { label: string; name: string; options: string[] }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <select value={(form as Record<string, string>)[name]} onChange={e => set(name, e.target.value)} style={selectStyle}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Vehicle Identity */}
      <div>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "#8c959f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>Vehicle Identity</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
          <Field label="Make" name="make" placeholder="e.g. Toyota" />
          <Field label="Model" name="carModel" placeholder="e.g. Land Cruiser 200" />
          <Field label="Year" name="year" type="number" placeholder="e.g. 2022" />
          <Field label="Color" name="color" placeholder="e.g. White" />
          <Field label="Chassis No." name="chassis" placeholder="e.g. JTF0001234567890" />
          <Field label="Location (Yard)" name="location" placeholder="e.g. Osaka Yard" />
        </div>
      </div>

      {/* Technical Specs */}
      <div>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "#8c959f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>Technical Specifications</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
          <Field label="Engine CC" name="engineCC" type="number" placeholder="e.g. 4500" />
          <Field label="Mileage (km)" name="mileage" type="number" placeholder="e.g. 45000" />
          <Field label="Doors" name="doors" type="number" placeholder="4" />
          <Field label="Seats" name="seats" type="number" placeholder="5" />
          <Select label="Drive" name="drive" options={DRIVE} />
          <Select label="Fuel" name="fuel" options={FUEL} />
          <Select label="Transmission" name="transmission" options={TRANSMISSION} />
          <Select label="Steering" name="steering" options={STEERING} />
        </div>
      </div>

      {error && (
        <div style={{ fontSize: "12px", color: "#cf222e", background: "#ffebe9", padding: "10px 14px", borderRadius: "8px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={() => router.back()} style={{
          padding: "10px 24px", borderRadius: "8px", border: "1px solid #d0d7de",
          background: "#f6f8fa", color: "#1f2328", fontSize: "13px", fontWeight: 600, cursor: "pointer",
        }}>Cancel</button>
        <button onClick={handleSubmit} disabled={saving} style={{
          padding: "10px 28px", borderRadius: "8px", border: "none",
          background: saving ? "#93c5fd" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
          color: "white", fontSize: "13px", fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer",
        }}>
          {saving ? "Saving…" : "Save Unit & Add Documents →"}
        </button>
      </div>
    </div>
  );
}
