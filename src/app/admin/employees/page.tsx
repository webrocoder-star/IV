"use client";

import { useEffect, useState } from "react";

interface Employee {
  id: number; sapId: string; employeeName: string;
  defaultShift: string | null; tlName: string | null;
  tlEmail: string | null; status: string; createdAt: string;
}

const EMPTY: Omit<Employee, "id" | "createdAt"> = {
  sapId: "", employeeName: "", defaultShift: "", tlName: "", tlEmail: "", status: "active"
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const LIMIT = 20;

  const load = async (p = page, s = search, sf = statusFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (s) params.set("search", s);
      if (sf) params.set("status", sf);
      const res = await fetch(`/api/admin/employees?${params}`);
      const d = await res.json();
      if (d.success) { setEmployees(d.data); setTotal(d.total); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); load(1, search, statusFilter); };

  const openAdd  = () => { setForm({ ...EMPTY }); setEditId(null); setFormError(""); setModal("add"); };
  const openEdit = (emp: Employee) => {
    setForm({ sapId: emp.sapId, employeeName: emp.employeeName, defaultShift: emp.defaultShift ?? "", tlName: emp.tlName ?? "", tlEmail: emp.tlEmail ?? "", status: emp.status });
    setEditId(emp.id); setFormError(""); setModal("edit");
  };

  const handleSave = async () => {
    if (!form.sapId || !form.employeeName) { setFormError("SAP ID and Employee Name are required."); return; }
    setSaving(true); setFormError("");
    try {
      const res = await fetch("/api/admin/employees", {
        method: modal === "add" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modal === "edit" ? { ...form, id: editId } : form),
      });
      const d = await res.json();
      if (!d.success) { setFormError(d.error || "Failed to save."); return; }
      setModal(null); load(page, search, statusFilter);
    } catch { setFormError("Server error."); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Deactivate ${name}?`)) return;
    await fetch(`/api/admin/employees?id=${id}`, { method: "DELETE" });
    load(page, search, statusFilter);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Employee Management</h1>
          <p>{total} total employees</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Employee</button>
      </div>

      {/* Filter Bar */}
      <form className="filter-bar" onSubmit={handleSearch}>
        <div className="form-group flex-1">
          <label className="form-label">Search</label>
          <input className="form-control" placeholder="SAP ID, Name, or TL Name…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="form-group" style={{ minWidth: 140 }}>
          <label className="form-label">Status</label>
          <select className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-end" }}>🔍 Search</button>
        <button type="button" className="btn btn-secondary" style={{ alignSelf: "flex-end" }} onClick={() => { setSearch(""); setStatusFilter(""); setPage(1); load(1, "", ""); }}>Reset</button>
      </form>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          {loading ? <div className="loading-center"><div className="spinner" /></div> : (
            <table className="data-table">
              <thead><tr>
                <th>#</th><th>SAP ID</th><th>Employee Name</th><th>Default Shift</th>
                <th>TL Name</th><th>TL Email</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr className="no-data"><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">👥</div><div>No employees found.</div></div></td></tr>
                ) : employees.map((emp, i) => (
                  <tr key={emp.id}>
                    <td className="muted">{(page - 1) * LIMIT + i + 1}</td>
                    <td><span style={{ fontFamily: "monospace", fontWeight: 700 }}>{emp.sapId}</span></td>
                    <td style={{ fontWeight: 600 }}>{emp.employeeName}</td>
                    <td className="muted">{emp.defaultShift || "—"}</td>
                    <td className="muted">{emp.tlName || "—"}</td>
                    <td className="muted" style={{ fontSize: "0.75rem" }}>{emp.tlEmail || "—"}</td>
                    <td><span className={`badge ${emp.status === "active" ? "badge-green" : "badge-gray"}`}>{emp.status}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(emp)}>✏️ Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(emp.id, emp.employeeName)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-light)", display: "flex", justifyContent: "flex-end" }}>
            <div className="pagination">
              <button disabled={page === 1} onClick={() => { setPage(p => p - 1); load(page - 1, search, statusFilter); }}>‹ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={page === p ? "active" : ""} onClick={() => { setPage(p); load(p, search, statusFilter); }}>{p}</button>
              ))}
              <button disabled={page === totalPages} onClick={() => { setPage(p => p + 1); load(page + 1, search, statusFilter); }}>Next ›</button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{modal === "add" ? "Add New Employee" : "Edit Employee"}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {formError && <div className="alert alert-error mb-4"><span>⚠️</span>{formError}</div>}
              <div className="grid grid-2 gap-4">
                <div className="form-group">
                  <label className="form-label">SAP ID *</label>
                  <input className="form-control" value={form.sapId} onChange={e => setForm(f => ({ ...f, sapId: e.target.value }))} placeholder="e.g. EMP12345" disabled={modal === "edit"} />
                </div>
                <div className="form-group">
                  <label className="form-label">Employee Name *</label>
                  <input className="form-control" value={form.employeeName} onChange={e => setForm(f => ({ ...f, employeeName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Default Shift</label>
                  <input className="form-control" value={form.defaultShift ?? ""} onChange={e => setForm(f => ({ ...f, defaultShift: e.target.value }))} placeholder="e.g. 10 AM - 7 PM" />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">TL Name</label>
                  <input className="form-control" value={form.tlName ?? ""} onChange={e => setForm(f => ({ ...f, tlName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">TL Email</label>
                  <input className="form-control" type="email" value={form.tlEmail ?? ""} onChange={e => setForm(f => ({ ...f, tlEmail: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : modal === "add" ? "Add Employee" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
