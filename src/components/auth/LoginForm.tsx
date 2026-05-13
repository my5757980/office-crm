"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginSchema, LoginFormData } from "@/lib/validations";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #d0d7de",
  borderRadius: "8px",
  fontSize: "14px",
  color: "#1f2328",
  background: "#ffffff",
  outline: "none",
  transition: "border-color 150ms, box-shadow 150ms",
};

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", { email: data.email, password: data.password, redirect: false });
      if (result?.error) setError("Invalid email or password. Please try again.");
      else { router.push("/dashboard"); router.refresh(); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1f2328", marginBottom: "6px" }}>
          Email address
        </label>
        <input
          {...register("email")}
          type="email"
          placeholder="you@office.com"
          autoComplete="email"
          style={inputStyle}
          onFocus={e => { e.target.style.borderColor = "#c0272d"; e.target.style.boxShadow = "0 0 0 3px rgba(192,39,45,0.12)"; }}
          onBlur={e => { e.target.style.borderColor = "#d0d7de"; e.target.style.boxShadow = "none"; }}
        />
        {errors.email && <p style={{ fontSize: "12px", color: "#cf222e", marginTop: "4px" }}>{errors.email.message}</p>}
      </div>

      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1f2328", marginBottom: "6px" }}>
          Password
        </label>
        <input
          {...register("password")}
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          style={inputStyle}
          onFocus={e => { e.target.style.borderColor = "#c0272d"; e.target.style.boxShadow = "0 0 0 3px rgba(192,39,45,0.12)"; }}
          onBlur={e => { e.target.style.borderColor = "#d0d7de"; e.target.style.boxShadow = "none"; }}
        />
        {errors.password && <p style={{ fontSize: "12px", color: "#cf222e", marginTop: "4px" }}>{errors.password.message}</p>}
      </div>

      {error && (
        <div style={{ background: "#ffebe9", border: "1px solid #ff818266", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#cf222e" }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          background: loading ? "#e57373" : "linear-gradient(135deg, #c0272d, #8b1a1e)",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 2px 8px rgba(192,39,45,0.35)",
          marginTop: "4px",
          transition: "all 150ms",
        }}
        onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
        onMouseLeave={e => { (e.target as HTMLButtonElement).style.transform = "translateY(0)"; }}
      >
        {loading ? (
          "Signing in…"
        ) : (
          "Sign in →"
        )}
      </button>
    </form>
  );
}
