"use client";

import { useEffect, useState } from "react";

interface ShiftRequest {
  id: number; sapId: string; maskedSapId: string; employeeName: string;
  requestedDate: string; currentShift: string; requestedShift: string;
  reason: string | null; status: string; rejectionReason: string | null;
  createdAt: string; tlName: string | null;
}

export default function ShiftRequestsPage() {
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [modal, setModal] = useState<{ id: number; action: "approved" | "denied" } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const LIMIT = 20;

  const load = async (p = page, s = statusFilter) => {
    setLoading(true); setPage(p);
    try {
      const res = await fetch(`/api/admin/shift-requests?page=${p}&limit=${LIMIT}${s ? `&status=${s}` : ""}`);
      const d = await res.json();
      if (d.success) { setRequests(d.data); setTotal(d.total); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAction = async () => {
    if (!modal) return;
    if (modal.action === "denied" && !rejectionReason.trim()) { alert("Please provide a reason for denial."); return; }
    setActionId(modal.id);
    try {
      await fetch("/api/admin/shift-requests", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: modal.id, action: modal.action, approvedBy: "Admin", rejectionReason: modal.action === "denied" ? rejectionReason : null }),
      });
      setModal(null); setRejectionReason(""); load(page, statusFilter);
    } catch {} finally { setActionId(null); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Shift Change Requests</h1>
          <p>Approve or deny employee shift change requests</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="form-group" style={{ minWidth: 200 }}>
          <label className="form-label">Status Filter</label>
          <select className="form-control" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); load(1, e.target.value); }}>
            <option value="">All Requests</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {loading ? <div className="loading-center"><div className="spinner" /></div> : (
            <table className="data-table">
              <thead><tr>
                <th>Date</th><th>Employee</th><th>Requested Date</th><th>Shift Change</th><th>Reason</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr className="no-data"><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">✉️</div><div>No requests found.</div></div></td></tr>
                ) : requests.map(req => (
                  <tr key={req.id}>
                    <td className="muted">{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{req.employeeName}</div>
                      <div className="hint">{req.maskedSapId}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{new Date(req.requestedDate).toLocaleDateString()}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <span className="muted">{req.currentShift}</span>
                        <span style={{ fontSize: "0.8rem", color: "var(--border)" }}>→</span>
                        <span style={{ color: "var(--primary)", fontWeight: 700 }}>{req.requestedShift}</span>
                      </div>
                    </td>
                    <td className="muted" style={{ maxWidth: 200, whiteSpace: "normal" }}>{req.reason || "—"}</td>
                    <td>
                      <span className={`badge ${req.status === "pending" ? "badge-amber" : req.status === "approved" ? "badge-green" : "badge-red"}`}>
                        {req.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {req.status === "pending" ? (
                        <div className="flex gap-2">
                          <button className="btn btn-success btn-sm" onClick={() => setModal({ id: req.id, action: "approved" })} disabled={actionId === req.id}>
                            {actionId === req.id ? "…" : "Approve"}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => { setModal({ id: req.id, action: "denied" }); setRejectionReason(""); }} disabled={actionId === req.id}>
                            {actionId === req.id ? "…" : "Deny"}
                          </button>
                        </div>
                      ) : (
                        <span className="hint">{req.status === "denied" && req.rejectionReason ? `Reason: ${req.rejectionReason}` : "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {totalPages > 1 && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-light)", display: "flex", justifyContent: "flex-end" }}>
            <div className="pagination">
              <button disabled={page === 1} onClick={() => load(page - 1, statusFilter)}>‹ Prev</button>
              {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => i + 1).map(p => (
                <button key={p} className={page === p ? "active" : ""} onClick={() => load(p, statusFilter)}>{p}</button>
              ))}
              <button disabled={page === totalPages} onClick={() => load(page + 1, statusFilter)}>Next ›</button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{modal.action === "approved" ? "Approve Request" : "Deny Request"}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="body-text mb-4">
                Are you sure you want to {modal.action === "approved" ? <strong className="badge badge-green">APPROVE</strong> : <strong className="badge badge-red">DENY</strong>} this shift change request?
                {modal.action === "approved" && " The employee's shift will be automatically updated for the requested date."}
              </p>
              
              {modal.action === "denied" && (
                <div className="form-group">
                  <label className="form-label">Reason for Denial *</label>
                  <textarea className="form-control" rows={3} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Please provide a reason..." />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className={`btn ${modal.action === "approved" ? "btn-success" : "btn-danger"}`} onClick={handleAction}>
                Confirm {modal.action === "approved" ? "Approval" : "Denial"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
