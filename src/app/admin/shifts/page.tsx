"use client";

import { useEffect, useState } from "react";

interface Shift {
  id: number; shiftLabel: string; colorHex: string | null;
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [form, setForm] = useState<{ shiftLabel: string; colorHex: string }>({ shiftLabel: "", colorHex: "#2e7d32" });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shifts");
      const d = await res.json();
      if (d.success) setShifts(d.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.shiftLabel.trim()) { setError("Shift label is required."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/shifts", {
        method: modal === "add" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modal === "edit" ? { ...form, id: editId } : form),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || "Failed to save."); return; }
      setModal(null); load();
    } catch { setError("Server error."); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, label: string) => {
    if (!confirm(`Delete shift "${label}"? This may affect employees assigned to this shift.`)) return;
    await fetch(`/api/admin/shifts?id=${id}`, { method: "DELETE" });
    load();
  };

  const openAdd = () => { setForm({ shiftLabel: "", colorHex: "#2e7d32" }); setEditId(null); setError(""); setModal("add"); };
  const openEdit = (s: Shift) => { setForm({ shiftLabel: s.shiftLabel, colorHex: s.colorHex || "#2e7d32" }); setEditId(s.id); setError(""); setModal("edit"); };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Shift Configuration</h1>
          <p>Manage available work shifts for employees</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Shift</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {loading ? <div className="loading-center"><div className="spinner" /></div> : (
            <table className="data-table">
              <thead><tr><th>Shift Label</th><th>Color Tag</th><th>Actions</th></tr></thead>
              <tbody>
                {shifts.length === 0 ? (
                  <tr className="no-data"><td colSpan={3}><div className="empty-state"><div className="empty-state-icon">⚙️</div><div>No shifts configured.</div></div></td></tr>
                ) : shifts.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.shiftLabel}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", background: s.colorHex || "#ccc" }} />
                        <span className="muted">{s.colorHex || "Default"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>✏️ Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id, s.shiftLabel)}>🗑️</button>
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
              <div className="modal-title">{modal === "add" ? "Add Shift" : "Edit Shift"}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error mb-4"><span>⚠️</span>{error}</div>}
              <div className="form-group mb-4">
                <label className="form-label">Shift Label *</label>
                <input className="form-control" value={form.shiftLabel} onChange={e => setForm(f => ({ ...f, shiftLabel: e.target.value }))} placeholder="e.g. 10 AM - 7 PM" />
              </div>
              <div className="form-group">
                <label className="form-label">Color Tag</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.colorHex} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))} style={{ width: 40, height: 40, padding: 0, border: "none", borderRadius: 4, cursor: "pointer" }} />
                  <input className="form-control" value={form.colorHex} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))} placeholder="#000000" style={{ flex: 1 }} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Shift"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
