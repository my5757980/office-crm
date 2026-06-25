"use client";

import { useRouter } from "next/navigation";

export default function InvoicesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
        <div style={{ textAlign: "center", maxWidth: "360px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "10px",
            background: "#ffebe9", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 16px",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#cf222e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1f2328", marginBottom: "6px" }}>
            Failed to load invoices
          </h2>
          <p style={{ fontSize: "13px", color: "#656d76", marginBottom: "20px", lineHeight: 1.5 }}>
            {error.message || "A server error occurred. This is usually temporary."}
          </p>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                color: "#656d76", background: "#f6f8fa", border: "1px solid #d0d7de",
                cursor: "pointer",
              }}
            >
              Go to Dashboard
            </button>
            <button
              onClick={reset}
              style={{
                padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                color: "white", background: "#2563eb", border: "none", cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
