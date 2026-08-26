"use client";

import { useEffect, useState } from "react";

interface AttendanceRecord {
  id: number; sapId: string; employeeName: string; attendanceDate: string;
  attendanceType: string; shift: string; tlName: string;
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sapId, setSapId] = useState("");
  const [type, setType] = useState("");
  const LIMIT = 25;

  const load = async (p = 1) => {
    setLoading(true); setPage(p);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate)   params.set("toDate", toDate);
      if (sapId)    params.set("sapId", sapId);
      if (type)     params.set("type", type);
      const res = await fetch(`/api/admin/attendance?${params}`);
      const d = await res.json();
      if (d.success) { setRecords(d.data); setTotal(d.total); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Attendance Logs</h1>
          <p>{total} records found</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="form-group">
          <label className="form-label">From Date</label>
          <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">To Date</label>
          <input type="date" className="form-control" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <div className="form-group" style={{ minWidth: 140 }}>
          <label className="form-label">SAP ID</label>
          <input className="form-control" placeholder="Search SAP ID" value={sapId} onChange={e => setSapId(e.target.value)} />
        </div>
        <div className="form-group" style={{ minWidth: 120 }}>
          <label className="form-label">Type</label>
          <select className="form-control" value={type} onChange={e => setType(e.target.value)}>
            <option value="">All</option>
            <option value="WFO">WFO</option>
            <option value="WFH">WFH</option>
          </select>
        </div>
        <button className="btn btn-primary" style={{ alignSelf: "flex-end" }} onClick={() => load(1)}>🔍 Filter</button>
        <button className="btn btn-secondary" style={{ alignSelf: "flex-end" }} onClick={() => { setFromDate(new Date().toISOString().slice(0,10)); setToDate(new Date().toISOString().slice(0,10)); setSapId(""); setType(""); setTimeout(() => load(1), 0); }}>Reset</button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          {loading ? <div className="loading-center"><div className="spinner" /></div> : (
            <table className="data-table">
              <thead><tr>
                <th>#</th><th>Date</th><th>SAP ID</th><th>Employee</th><th>Type</th><th>Shift</th><th>TL</th>
              </tr></thead>
              <tbody>
                {records.length === 0 ? (
                  <tr className="no-data"><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">📋</div><div>No attendance records found.</div></div></td></tr>
                ) : records.map((r, i) => (
                  <tr key={r.id}>
                    <td className="muted">{(page - 1) * LIMIT + i + 1}</td>
                    <td>{new Date(r.attendanceDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td><span style={{ fontFamily: "monospace", fontWeight: 700 }}>{r.sapId}</span></td>
                    <td style={{ fontWeight: 600 }}>{r.employeeName}</td>
                    <td><span className={`badge ${r.attendanceType === "WFO" ? "badge-blue" : "badge-green"}`}>{r.attendanceType}</span></td>
                    <td className="muted">{r.shift}</td>
                    <td className="muted">{r.tlName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {totalPages > 1 && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-light)", display: "flex", justifyContent: "flex-end" }}>
            <div className="pagination">
              <button disabled={page === 1} onClick={() => load(page - 1)}>‹ Prev</button>
              {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => i + 1).map(p => (
                <button key={p} className={page === p ? "active" : ""} onClick={() => load(p)}>{p}</button>
              ))}
              <button disabled={page === totalPages} onClick={() => load(page + 1)}>Next ›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
