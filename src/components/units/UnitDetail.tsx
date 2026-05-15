"use client";

import { useState } from "react";

const FOLDERS = [
  "Auction Details/Pics",
  "Export Certificate",
  "Yard Pictures",
  "Inspection Certificate",
  "BL / Surrender",
  "DHL",
] as const;

const FOLDER_ICONS: Record<string, string> = {
  "Auction Details/Pics":   "🏷️",
  "Export Certificate":     "📄",
  "Yard Pictures":          "📸",
  "Inspection Certificate": "🔍",
  "BL / Surrender":         "🚢",
  "DHL":                    "📦",
};

interface FileEntry {
  _id: string;
  filename: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
}

interface UnitDetailProps {
  unit: {
    _id: string;
    make: string; carModel: string; year: number; color: string;
    chassis: string; engineCC: number; drive: string; fuel: string;
    mileage: number; transmission: string; steering: string;
    doors: number; seats: number; location: string;
    createdBy?: { name: string };
    createdAt: string;
  };
  documents: Record<string, FileEntry[]>;
  role: string;
}

function DataRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: "flex", gap: "12px", padding: "9px 0", borderBottom: "1px solid #f0f2f4" }}>
      <span style={{ fontSize: "11px", color: "#8c959f", fontWeight: 500, width: "130px", flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ fontSize: "13px", color: "#1f2328", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UnitDetail({ unit, documents: initialDocs, role }: UnitDetailProps) {
  const canManage = ["admin", "manager", "super_admin"].includes(role);
  const [documents, setDocuments] = useState(initialDocs);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);

  const handleUpload = async (folder: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(folder);
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    const res = await fetch(`/api/units/${unit._id}/documents`, { method: "POST", body: form });
    if (res.ok) {
      const { file: newFile } = await res.json();
      setDocuments(prev => ({
        ...prev,
        [folder]: [...(prev[folder] ?? []), newFile],
      }));
    } else {
      const j = await res.json();
      alert(j.error ?? "Upload failed");
    }
    setUploading(null);
    e.target.value = "";
  };

  const handleDelete = async (folder: string, fileId: string) => {
    if (!confirm("Delete this file?")) return;
    setDeleting(fileId);
    const res = await fetch(`/api/units/${unit._id}/documents/${fileId}`, { method: "DELETE" });
    if (res.ok) {
      setDocuments(prev => ({
        ...prev,
        [folder]: prev[folder].filter(f => f._id !== fileId),
      }));
    } else {
      alert("Delete failed");
    }
    setDeleting(null);
  };

  const isImage = (mimetype: string) => mimetype.startsWith("image/");

  const cardStyle: React.CSSProperties = {
    background: "#ffffff", border: "1px solid #d0d7de",
    borderRadius: "10px", overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Unit Header */}
      <div style={cardStyle}>
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #d0d7de",
          background: "linear-gradient(135deg, #f6f8fa 0%, #eff6ff 100%)",
          display: "flex", alignItems: "center", gap: "16px",
        }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "10px", flexShrink: 0,
            background: "linear-gradient(135deg, #059669, #047857)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px", boxShadow: "0 4px 12px rgba(5,150,105,0.3)",
          }}>🚗</div>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1f2328" }}>
              {unit.year} {unit.make} {unit.carModel}
            </h2>
            <p style={{ fontSize: "12px", color: "#8c959f", marginTop: "4px" }}>
              Chassis: <strong style={{ color: "#656d76" }}>{unit.chassis}</strong>
              {unit.createdBy && ` · Added by ${unit.createdBy.name}`}
              {" · "}{new Date(unit.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ padding: "20px 24px", borderRight: "1px solid #f0f2f4" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#8c959f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Vehicle Info</p>
            <DataRow label="Make / Model" value={`${unit.make} ${unit.carModel}`} />
            <DataRow label="Year"         value={unit.year} />
            <DataRow label="Color"        value={unit.color} />
            <DataRow label="Chassis"      value={unit.chassis} />
            <DataRow label="Location"     value={unit.location} />
          </div>
          <div style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#8c959f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Specifications</p>
            <DataRow label="Engine CC"    value={`${unit.engineCC.toLocaleString()} cc`} />
            <DataRow label="Drive"        value={unit.drive} />
            <DataRow label="Fuel"         value={unit.fuel} />
            <DataRow label="Mileage"      value={`${unit.mileage.toLocaleString()} km`} />
            <DataRow label="Transmission" value={unit.transmission} />
            <DataRow label="Steering"     value={unit.steering} />
            <DataRow label="Doors / Seats" value={`${unit.doors} doors · ${unit.seats} seats`} />
          </div>
        </div>
      </div>

      {/* Document Folders */}
      <div style={cardStyle}>
        <div style={{ padding: "14px 24px", borderBottom: "1px solid #d0d7de", background: "linear-gradient(135deg, #f6f8fa 0%, #eff6ff 100%)" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#1f2328" }}>Document Repository</p>
          <p style={{ fontSize: "12px", color: "#8c959f", marginTop: "2px" }}>Upload files to each folder — PDF, JPG, PNG and other formats supported</p>
        </div>

        <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {FOLDERS.map(folder => {
            const files = documents[folder] ?? [];
            return (
              <div key={folder} style={{
                border: "1px solid #d0d7de", borderRadius: "10px", overflow: "hidden",
              }}>
                {/* Folder Header */}
                <div style={{
                  padding: "10px 14px", background: "#f6f8fa",
                  borderBottom: files.length > 0 ? "1px solid #d0d7de" : "none",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px" }}>{FOLDER_ICONS[folder]}</span>
                    <div>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: "#1f2328" }}>{folder}</p>
                      <p style={{ fontSize: "10px", color: "#8c959f" }}>{files.length} file{files.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  {canManage && (
                    <label style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "6px",
                      color: uploading === folder ? "#8c959f" : "#2563eb",
                      background: uploading === folder ? "#f6f8fa" : "#eff6ff",
                      border: `1px solid ${uploading === folder ? "#d0d7de" : "#bfdbfe"}`,
                      cursor: uploading === folder ? "not-allowed" : "pointer",
                    }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      {uploading === folder ? "Uploading…" : "Upload"}
                      <input
                        type="file"
                        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                        onChange={e => handleUpload(folder, e)}
                        disabled={uploading !== null}
                        style={{ display: "none" }}
                      />
                    </label>
                  )}
                </div>

                {/* Files List */}
                {files.length > 0 && (
                  <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                    {files.map(file => (
                      <div key={file._id} style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "8px 14px", borderBottom: "1px solid #f0f2f4",
                      }}>
                        <span style={{ fontSize: "16px", flexShrink: 0 }}>
                          {isImage(file.mimetype) ? "🖼️" : file.mimetype === "application/pdf" ? "📄" : "📎"}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <a
                            href={`/api/units/${unit._id}/documents/${file._id}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: "12px", color: "#2563eb", fontWeight: 500, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
                            {file.filename}
                          </a>
                          <p style={{ fontSize: "10px", color: "#8c959f" }}>{formatSize(file.size)}</p>
                        </div>
                        {canManage && (
                          <button
                            onClick={() => handleDelete(folder, file._id)}
                            disabled={deleting === file._id}
                            style={{
                              flexShrink: 0, padding: "3px 6px", borderRadius: "4px",
                              border: "none", background: "transparent", cursor: "pointer",
                              color: "#cf222e", fontSize: "11px", opacity: deleting === file._id ? 0.5 : 1,
                            }}
                          >✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {files.length === 0 && (
                  <div style={{ padding: "16px 14px", textAlign: "center", fontSize: "11px", color: "#8c959f" }}>
                    No files yet
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
