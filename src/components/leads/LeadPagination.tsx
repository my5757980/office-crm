"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
}

export default function LeadPagination({ page, totalPages, total, limit }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goto = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Compact page-number window
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  const btn = (disabled: boolean): React.CSSProperties => ({
    padding: "6px 12px", borderRadius: "6px",
    border: "1px solid #d0d7de", background: "#fff",
    fontSize: "12px", fontWeight: 600,
    color: disabled ? "#c0c6cc" : "#1f2328",
    cursor: disabled ? "not-allowed" : "pointer",
  });

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px 20px", borderTop: "1px solid #f0f2f4", flexWrap: "wrap" }}>
      <span style={{ fontSize: "12px", color: "#656d76" }}>
        Showing <b>{from}–{to}</b> of <b>{total}</b>
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        <button onClick={() => goto(1)}       disabled={page <= 1} style={btn(page <= 1)}>« First</button>
        <button onClick={() => goto(page - 1)} disabled={page <= 1} style={btn(page <= 1)}>‹ Prev</button>

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => goto(p)}
            style={{
              padding: "6px 11px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer",
              border: `1px solid ${p === page ? "#c0272d" : "#d0d7de"}`,
              background: p === page ? "#c0272d" : "#fff",
              color: p === page ? "#fff" : "#1f2328",
            }}
          >
            {p}
          </button>
        ))}

        <button onClick={() => goto(page + 1)}      disabled={page >= totalPages} style={btn(page >= totalPages)}>Next ›</button>
        <button onClick={() => goto(totalPages)}    disabled={page >= totalPages} style={btn(page >= totalPages)}>Last »</button>
      </div>
    </div>
  );
}
