"use client";

import { useEffect, useState } from "react";

interface AdminUser { id: number; email: string; createdAt: string; }

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "reset" | null>(null);
  const [formEmail, setFormEmail] = useState("");
  const [formPass, setFormPass] = useState("");
  const [targetId, setTargetId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admins");
      const d = await res.json();
      if (d.success) setAdmins(d.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (modal === "add" && (!formEmail || !formPass)) { setError("Email and password are required."); return; }
    if (modal === "reset" && !formPass) { setError("New password is required."); return; }
    
    setSaving(true); setError("");
    try {
      if (modal === "add") {
        const res = await fetch("/api/admin/admins", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formEmail, password: formPass }),
        });
        const d = await res.json();
        if (!d.success) { setError(d.error || "Failed to create admin."); return; }
      } else if (modal === "reset") {
        const res = await fetch("/api/admin/admins/reset-password", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminId: targetId, newPassword: formPass }),
        });
        const d = await res.json();
        if (!d.success) { setError(d.error || "Failed to reset password."); return; }
      }
      setModal(null); load();
    } catch { setError("Server error."); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, email: string) => {
    if (!confirm(`Delete admin user ${email}?`)) return;
    await fetch(`/api/admin/admins?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Admin Users</h1>
          <p>Manage users with access to the admin portal</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormEmail(""); setFormPass(""); setError(""); setModal("add"); }}>+ Add Admin</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {loading ? <div className="loading-center"><div className="spinner" /></div> : (
            <table className="data-table">
              <thead><tr><th>Email</th><th>Added Date</th><th>Actions</th></tr></thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr className="no-data"><td colSpan={3}><div className="empty-state"><div className="empty-state-icon">🔑</div><div>No admin users found.</div></div></td></tr>
                ) : admins.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.email}</td>
                    <td className="muted">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-secondary btn-sm" onClick={() => { setTargetId(a.id); setFormPass(""); setError(""); setModal("reset"); }}>🔑 Reset Password</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id, a.email)}>🗑️ Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{modal === "add" ? "Create Admin User" : "Reset Admin Password"}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error mb-4"><span>⚠️</span>{error}</div>}
              {modal === "add" && (
                <div className="form-group mb-4">
                  <label className="form-label">Email Address *</label>
                  <input className="form-control" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">{modal === "add" ? "Password *" : "New Password *"}</label>
                <input className="form-control" type="password" value={formPass} onChange={e => setFormPass(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : modal === "add" ? "Create Admin" : "Reset Password"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
