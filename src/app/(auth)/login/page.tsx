import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
        <img src="/logo.png" alt="Logo" style={{ height: "52px", width: "auto", objectFit: "contain" }} />
      </div>

      <div style={{
        background: "#ffffff",
        border: "1px solid #d0d7de",
        borderRadius: "12px",
        padding: "32px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1f2328" }}>Welcome back</h1>
          <p style={{ fontSize: "13px", color: "#656d76", marginTop: "4px" }}>Sign in to your account to continue</p>
        </div>
        <LoginForm />
      </div>

      <p style={{ textAlign: "center", fontSize: "13px", color: "#656d76", marginTop: "20px" }}>
        Forgot your password?{" "}
        <Link href="/forgot-password" style={{ color: "#c0272d", fontWeight: 600, textDecoration: "none" }}>
          Reset it here
        </Link>
      </p>
    </div>
  );
}
