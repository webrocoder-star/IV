"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/admin/dashboard");
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please enter email and password."); return; }
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    router.push("/admin/dashboard"); router.refresh();
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      {/* Brand Header */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ width: 56, height: 56, background: "var(--primary)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 4px 16px rgba(27,94,32,0.35)" }}>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: "1.2rem" }}>IV</span>
        </div>
        <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--primary)", letterSpacing: 0.5 }}>IV ATTENDANCE TRACKER</div>
        <div className="hint" style={{ marginTop: 4 }}>Admin Portal</div>
      </div>

      {/* Login Card */}
      <div className="card" style={{ width: "100%", maxWidth: 400 }}>
        <div className="card-header" style={{ background: "var(--primary-soft)", borderBottom: "2px solid #c8e6c9" }}>
          <div>
            <div className="section-title" style={{ color: "var(--primary)" }}>Administrator Login</div>
            <div className="hint">Sign in to access the admin panel</div>
          </div>
          <span style={{ fontSize: "1.3rem" }}>🔐</span>
        </div>

        <form onSubmit={handleSubmit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && <div className="alert alert-error"><span>⚠️</span><span>{error}</span></div>}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input id="login-email" type="email" className="form-control" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="admin@yourcompany.com" autoComplete="email" />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: "relative" }}>
              <input id="login-password" type={showPass ? "text" : "password"} className="form-control"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter password" autoComplete="current-password"
                style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem" }}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button id="login-btn" type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />Signing in...</> : "LOGIN TO ADMIN PORTAL"}
          </button>
        </form>
      </div>

      <Link href="/" className="btn btn-secondary btn-sm" style={{ marginTop: 20, fontSize: "0.75rem" }}>
        ← Back to Employee Portal
      </Link>

      <div className="hint" style={{ marginTop: 16, textAlign: "center" }}>
        © {new Date().getFullYear()} IV Attendance Tracker — Internal HR System
      </div>
    </div>
  );
}
