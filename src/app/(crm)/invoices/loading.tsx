export default function InvoicesLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ height: "56px", borderBottom: "1px solid #e5e7eb", background: "#ffffff" }} />
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ height: "28px", width: "160px", borderRadius: "6px", background: "#e5e7eb", animation: "pulse 1.5s infinite" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ height: "80px", borderRadius: "10px", background: "#e5e7eb", animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
        <div style={{ flex: 1, borderRadius: "10px", background: "#e5e7eb", minHeight: "300px", animation: "pulse 1.5s infinite" }} />
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  );
}
