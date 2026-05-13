export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const particles = [
    { size: 5,  left: "12%",  delay: "0s",    dur: "9s",  anim: "floatUp1" },
    { size: 8,  left: "25%",  delay: "1.5s",  dur: "11s", anim: "floatUp2" },
    { size: 4,  left: "40%",  delay: "3s",    dur: "8s",  anim: "floatUp3" },
    { size: 6,  left: "58%",  delay: "0.8s",  dur: "13s", anim: "floatUp1" },
    { size: 10, left: "70%",  delay: "2.2s",  dur: "10s", anim: "floatUp2" },
    { size: 4,  left: "82%",  delay: "4s",    dur: "9s",  anim: "floatUp3" },
    { size: 7,  left: "6%",   delay: "5s",    dur: "12s", anim: "floatUp1" },
    { size: 5,  left: "90%",  delay: "1s",    dur: "14s", anim: "floatUp2" },
    { size: 9,  left: "48%",  delay: "6s",    dur: "10s", anim: "floatUp3" },
    { size: 4,  left: "33%",  delay: "2.8s",  dur: "11s", anim: "floatUp1" },
  ];

  return (
    <>
      <style>{`
        .auth-fade { animation: fadeInUp 350ms ease forwards; }
        .auth-left { display: flex; }
        @media (max-width: 900px) { .auth-left { display: none !important; } }
      `}</style>

      <div style={{ minHeight: "100vh", display: "flex", background: "#0d1117" }}>

        {/* ── Left panel — branding ─────────────────────── */}
        <div className="auth-left" style={{
          width: "52%", flexShrink: 0,
          position: "relative",
          flexDirection: "column", justifyContent: "space-between",
          padding: "48px 52px",
          overflow: "hidden",
          borderRight: "1px solid #21262d",
        }}>

          {/* Animated grid */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "linear-gradient(rgba(192,39,45,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(192,39,45,0.07) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            animation: "gridMove 8s linear infinite",
          }} />

          {/* Orb 1 — blue */}
          <div style={{
            position: "absolute", top: "-120px", left: "-120px",
            width: "500px", height: "500px", borderRadius: "50%",
            background: "radial-gradient(circle, #c0272d 0%, transparent 68%)",
            animation: "orbPulse 5s ease-in-out infinite",
            pointerEvents: "none",
          }} />

          {/* Orb 2 — purple */}
          <div style={{
            position: "absolute", bottom: "-160px", right: "-120px",
            width: "440px", height: "440px", borderRadius: "50%",
            background: "radial-gradient(circle, #7b0e12 0%, transparent 68%)",
            animation: "orbPulse2 6s ease-in-out infinite",
            pointerEvents: "none",
          }} />

          {/* Orb 3 — accent glow top-right */}
          <div style={{
            position: "absolute", top: "30%", right: "-60px",
            width: "200px", height: "200px", borderRadius: "50%",
            background: "radial-gradient(circle, #c0272d 0%, transparent 70%)",
            opacity: 0.15,
            animation: "orbPulse 7s ease-in-out infinite 2s",
            pointerEvents: "none",
          }} />

          {/* Floating particles */}
          {particles.map((p, i) => (
            <div key={i} style={{
              position: "absolute",
              bottom: "-10px",
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: "50%",
              background: i % 3 === 0 ? "rgba(192,39,45,0.7)" : i % 3 === 1 ? "rgba(123,14,18,0.6)" : "rgba(220,80,80,0.5)",
              boxShadow: i % 2 === 0 ? `0 0 ${p.size * 2}px rgba(192,39,45,0.5)` : `0 0 ${p.size * 2}px rgba(123,14,18,0.4)`,
              animation: `${p.anim} ${p.dur} ${p.delay} ease-in infinite`,
              pointerEvents: "none",
            }} />
          ))}

          {/* Logo */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <img src="/logo.png" alt="Logo" style={{ height: "48px", width: "auto", objectFit: "contain" }} />
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981", animation: "pulse-dot 2s infinite" }} />
                <span style={{ fontSize: "11px", color: "#656d76" }}>Vehicle Export Platform</span>
              </div>
            </div>
          </div>

          {/* Main copy */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#ffffff", marginBottom: "20px" }}>
              SBK CRM
            </p>
            <h1 style={{ fontSize: "48px", fontWeight: 800, color: "white", lineHeight: 1.07, letterSpacing: "-0.035em", marginBottom: "20px" }}>
              Manage leads.<br />
              <span style={{
                background: "linear-gradient(90deg, #c0272d, #e05a5a)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundSize: "200% 200%",
                animation: "gradientShift 4s ease infinite",
              }}>
                Close deals.
              </span><br />
              Ship global.
            </h1>
            <p style={{ fontSize: "15px", color: "#656d76", lineHeight: 1.7, maxWidth: "340px", marginBottom: "36px" }}>
              Full pipeline from lead generation to invoice approval — built for professional vehicle export operations.
            </p>

            {/* Features */}
            <div style={{ display: "flex", flexDirection: "column", gap: "13px", marginBottom: "48px" }}>
              {[
                "Role-based access for every team member",
                "4-stage invoice approval workflow",
                "Real-time in-app notifications",
                "Lead notes and team collaboration",
              ].map((text, i) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: "12px", animation: `fadeInUp 400ms ${i * 80}ms ease both` }}>
                  <div style={{
                    width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                    background: "rgba(192,39,45,0.12)",
                    border: "1px solid rgba(192,39,45,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 0 8px rgba(192,39,45,0.2)",
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c0272d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span style={{ fontSize: "13px", color: "#8c959f" }}>{text}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div style={{ display: "flex", alignItems: "center", gap: "32px", paddingTop: "28px", borderTop: "1px solid #21262d" }}>
              {[["500+", "Leads Tracked"], ["40+", "Countries"], ["4", "User Roles"]].map(([val, label]) => (
                <div key={label}>
                  <p style={{ fontSize: "22px", fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>{val}</p>
                  <p style={{ fontSize: "11px", color: "#656d76", marginTop: "2px" }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right panel — form ────────────────────────── */}
        <div style={{
          flex: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "32px",
          background: "#f6f8fa",
          overflowY: "auto",
          position: "relative",
        }}>
          {/* Subtle dot bg on form panel */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "radial-gradient(circle, #d0d7de 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            opacity: 0.5,
          }} />
          <div className="auth-fade" style={{ width: "100%", maxWidth: "400px", position: "relative", zIndex: 1 }}>
            {children}
          </div>
        </div>

      </div>
    </>
  );
}
