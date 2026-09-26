import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

// Set by /api/auth/sso when "CRM Global" on the website could not sign in.
const SSO_NOTES: Record<string, string> = {
  nomatch: "No CRM account matches your website login. Please sign in with your CRM email and password.",
  invalid: "That website sign-in link has expired or is not valid. Click CRM Global again, or sign in below.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sso?: string }> }) {
  const { sso } = await searchParams;
  const ssoNote = sso ? SSO_NOTES[sso] : undefined;

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
        {ssoNote && (
          <div style={{ background: "#fff8c5", border: "1px solid #d4a72c66", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#7d4e00", marginBottom: "18px" }}>
            {ssoNote}
          </div>
        )}
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
