"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Stats {
  totalEmployees: number; todayAttendance: number;
  wfo: number; wfh: number; missing: number; onLeave: number; pendingRequests: number;
}
interface AttendanceRec {
  date: string; maskedSapId: string; employeeName: string;
  shift: string; attendanceType: string; tlName?: string;
}
interface ShiftReq {
  id: number; maskedSapId: string; employeeName: string;
  requestedDate: string; currentShift: string; requestedShift: string; status: string;
}

const DEFAULT_STATS: Stats = {
  totalEmployees: 0, todayAttendance: 0,
  wfo: 0, wfh: 0, missing: 0, onLeave: 0, pendingRequests: 0,
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [attendance, setAttendance] = useState<AttendanceRec[]>([]);
  const [requests, setRequests] = useState<ShiftReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.status === 401) {
        setError("Session expired. Please refresh the page.");
        return;
      }
      if (!res.ok) {
        setError("Failed to load dashboard data. Please refresh.");
        return;
      }
      const d = await res.json();
      setStats(d.stats ?? DEFAULT_STATS);
      setAttendance(d.recentAttendance ?? []);
      setRequests(d.shiftRequests ?? []);
    } catch {
      setError("Connection error. Please check your internet and refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: number, action: "approved" | "denied") => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/shift-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, approvedBy: "Admin" }),
      });
      if (res.ok) load();
    } catch {
      // fail silently, user can refresh
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, flexDirection: "column", gap: 12 }}>
        <div className="spinner" />
        <div className="hint">Loading dashboard…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-left"><h1>Dashboard</h1></div>
        </div>
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <span>⚠️</span><span>{error}</span>
        </div>
        <button className="btn btn-primary" onClick={() => { setLoading(true); load(); }}>
          🔄 Retry
        </button>
      </div>
    );
  }

  const statCards = [
    { label: "Total Employees",    value: stats.totalEmployees,  icon: "👥", color: "blue",   sub: "Active" },
    { label: "Today Attendance",   value: stats.todayAttendance, icon: "✅", color: "green",  sub: `WFO: ${stats.wfo} · WFH: ${stats.wfh}` },
    { label: "Work From Office",   value: stats.wfo,             icon: "🏢", color: "blue",   sub: "Today" },
    { label: "Work From Home",     value: stats.wfh,             icon: "🏠", color: "green",  sub: "Today" },
    { label: "Missing Attendance", value: stats.missing,         icon: "⚠️", color: "amber",  sub: "Not submitted today" },
    { label: "On Leave",           value: stats.onLeave,         icon: "🏖️", color: "purple", sub: "Approved leave today" },
    { label: "Pending Requests",   value: stats.pendingRequests, icon: "🔄", color: "red",    sub: "Shift change" },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard</h1>
          <p>Overview of today's attendance and pending actions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setLoading(true); load(); }} className="btn btn-secondary btn-sm">🔄 Refresh</button>
          <Link href="/admin/export" className="btn btn-primary btn-sm">📥 Export</Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {statCards.map(card => (
          <div key={card.label} className="stat-card">
            <div>
              <div className="stat-card-label">{card.label}</div>
              <div className="stat-card-value">{card.value}</div>
              <div className="stat-card-sub">{card.sub}</div>
            </div>
            <div className={`stat-card-icon ${card.color}`}>{card.icon}</div>
          </div>
        ))}
      </div>

      {/* Two Columns */}
      <div className="grid grid-2 gap-4" style={{ marginBottom: 20 }}>

        {/* Recent Attendance */}
        <div className="card">
          <div className="card-header">
            <div className="section-title">Recent Attendance — Today</div>
            <Link href="/admin/attendance" className="btn btn-outline btn-sm">View All</Link>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>SAP ID</th><th>Employee</th><th>Shift</th><th>Type</th></tr>
              </thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr className="no-data">
                    <td colSpan={4}>
                      <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <div className="empty-state-text">No attendance submitted yet today.</div>
                      </div>
                    </td>
                  </tr>
                ) : attendance.map((r, i) => (
                  <tr key={i}>
                    <td><span style={{ fontFamily: "monospace", fontWeight: 700 }}>{r.maskedSapId}</span></td>
                    <td style={{ fontWeight: 600 }}>{r.employeeName}</td>
                    <td className="muted">{r.shift}</td>
                    <td>
                      <span className={`badge ${r.attendanceType === "WFO" ? "badge-blue" : "badge-green"}`}>
                        {r.attendanceType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shift Change Requests */}
        <div className="card">
          <div className="card-header">
            <div className="section-title">
              Pending Shift Requests
              {requests.length > 0 && <span className="badge badge-amber" style={{ marginLeft: 8 }}>{requests.length}</span>}
            </div>
            <Link href="/admin/shift-requests" className="btn btn-outline btn-sm">View All</Link>
          </div>
          {requests.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px 20px" }}>
              <div className="empty-state-icon">🎉</div>
              <div className="empty-state-text">No pending requests.</div>
            </div>
          ) : requests.map(req => (
            <div key={req.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.employeeName}</div>
                <div className="hint">{req.maskedSapId} · {req.requestedDate}</div>
                <div className="hint" style={{ marginTop: 2 }}>
                  <span style={{ color: "var(--text-muted)" }}>{req.currentShift}</span>
                  <span style={{ margin: "0 4px" }}>→</span>
                  <span style={{ color: "var(--primary-light)", fontWeight: 700 }}>{req.requestedShift}</span>
                </div>
              </div>
              <div className="flex gap-1" style={{ flexShrink: 0 }}>
                <button
                  className="btn btn-success btn-sm"
                  disabled={actionLoading === req.id}
                  onClick={() => handleAction(req.id, "approved")}
                  title="Approve"
                >
                  {actionLoading === req.id ? "…" : "✅"}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  disabled={actionLoading === req.id}
                  onClick={() => handleAction(req.id, "denied")}
                  title="Deny"
                >
                  {actionLoading === req.id ? "…" : "❌"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-2 gap-4">
        <div className="card">
          <div className="card-header"><div className="section-title">Quick Export</div></div>
          <div className="card-body flex gap-3">
            <a
              href={`/api/admin/export?fromDate=${new Date().toISOString().slice(0, 7)}-01&toDate=${new Date().toISOString().slice(0, 10)}&format=excel`}
              className="btn btn-success flex-1"
            >
              📊 Excel
            </a>
            <a
              href={`/api/admin/export?fromDate=${new Date().toISOString().slice(0, 7)}-01&toDate=${new Date().toISOString().slice(0, 10)}&format=csv`}
              className="btn btn-outline flex-1"
            >
              📄 CSV
            </a>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="section-title">Quick Links</div></div>
          <div className="card-body">
            <div className="flex flex-wrap gap-2">
              {[
                { label: "👥 Employees",   href: "/admin/employees" },
                { label: "📋 Attendance",  href: "/admin/attendance" },
                { label: "⚙️ Shifts",      href: "/admin/shifts" },
                { label: "🏖️ Leave",       href: "/admin/leave" },
                { label: "🔑 Admins",      href: "/admin/admins" },
                { label: "📥 Export",      href: "/admin/export" },
              ].map(l => (
                <Link key={l.href} href={l.href} className="btn btn-secondary btn-sm">{l.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
