"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalEmployees: number; todayAttendance: number;
  wfo: number; wfh: number; missing: number; onLeave: number; pendingRequests: number;
}
interface AttendanceRec {
  date: string; maskedSapId: string; employeeName: string;
  shift: string; attendanceType: string; tlName: string;
}
interface ShiftReq {
  id: number; maskedSapId: string; employeeName: string;
  requestedDate: string; currentShift: string; requestedShift: string; status: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRec[]>([]);
  const [requests, setRequests] = useState<ShiftReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) return;
      const d = await res.json();
      setStats(d.stats); setAttendance(d.recentAttendance); setRequests(d.shiftRequests);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id: number, action: "approved" | "denied") => {
    setActionLoading(id);
    try {
      await fetch("/api/admin/shift-requests", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, approvedBy: "Admin" }),
      });
      load();
    } catch {} finally { setActionLoading(null); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const statCards = [
    { label: "Total Employees",   value: stats?.totalEmployees  ?? 0, icon: "👥", color: "blue",   sub: "Active" },
    { label: "Today Attendance",  value: stats?.todayAttendance ?? 0, icon: "✅", color: "green",  sub: `WFO: ${stats?.wfo??0} · WFH: ${stats?.wfh??0}` },
    { label: "Work From Office",  value: stats?.wfo             ?? 0, icon: "🏢", color: "blue",   sub: "Today" },
    { label: "Work From Home",    value: stats?.wfh             ?? 0, icon: "🏠", color: "green",  sub: "Today" },
    { label: "Missing Attendance",value: stats?.missing         ?? 0, icon: "⚠️", color: "amber",  sub: "Not submitted today" },
    { label: "On Leave",          value: stats?.onLeave         ?? 0, icon: "🏖️", color: "purple", sub: "Approved leave today" },
    { label: "Pending Requests",  value: stats?.pendingRequests ?? 0, icon: "✉️", color: "red",    sub: "Shift change" },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard</h1>
          <p>Overview of today's attendance and pending actions</p>
        </div>
        <Link href="/admin/export" className="btn btn-primary btn-sm">📥 Export Attendance</Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-4 gap-4" style={{ marginBottom: 20 }}>
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

      {/* Two Columns: Attendance + Requests */}
      <div className="grid grid-2 gap-4" style={{ marginBottom: 20 }}>

        {/* Recent Attendance */}
        <div className="card">
          <div className="card-header">
            <div className="section-title">Recent Attendance Overview</div>
            <Link href="/admin/attendance" className="btn btn-outline btn-sm">View All</Link>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>SAP ID</th><th>Employee</th><th>Shift</th><th>Type</th></tr>
              </thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr className="no-data"><td colSpan={5}>No attendance today yet.</td></tr>
                ) : attendance.map((r, i) => (
                  <tr key={i}>
                    <td className="muted">{r.date}</td>
                    <td><span style={{ fontFamily: "monospace", fontWeight: 700 }}>{r.maskedSapId}</span></td>
                    <td>{r.employeeName}</td>
                    <td className="muted">{r.shift}</td>
                    <td><span className={`badge ${r.attendanceType === "WFO" ? "badge-blue" : "badge-green"}`}>{r.attendanceType}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shift Change Requests */}
        <div className="card">
          <div className="card-header">
            <div className="section-title">Shift Change Requests</div>
            <Link href="/admin/shift-requests" className="btn btn-outline btn-sm">View All</Link>
          </div>
          <div>
            {requests.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">🎉</div><div className="empty-state-text">No pending requests.</div></div>
            ) : requests.map(req => (
              <div key={req.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{req.employeeName}</div>
                  <div className="hint">{req.maskedSapId} · {req.requestedDate}</div>
                  <div className="hint" style={{ marginTop: 2 }}>
                    <span style={{ color: "var(--text-muted)" }}>{req.currentShift}</span>
                    {" → "}
                    <span style={{ color: "var(--primary-light)", fontWeight: 700 }}>{req.requestedShift}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-success btn-sm" disabled={actionLoading === req.id} onClick={() => handleAction(req.id, "approved")}>
                    {actionLoading === req.id ? "…" : "✅"}
                  </button>
                  <button className="btn btn-danger btn-sm" disabled={actionLoading === req.id} onClick={() => handleAction(req.id, "denied")}>
                    {actionLoading === req.id ? "…" : "❌"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Shortcuts + Quick Links */}
      <div className="grid grid-2 gap-4">
        {/* Export Attendance */}
        <div className="card">
          <div className="card-header"><div className="section-title">Export Attendance</div></div>
          <div className="card-body flex gap-3">
            <a href="/api/admin/export?fromDate=2025-01-01&toDate=2025-12-31&format=excel" className="btn btn-success flex-1">
              📊 Download Excel
            </a>
            <a href="/api/admin/export?fromDate=2025-01-01&toDate=2025-12-31&format=csv" className="btn btn-outline flex-1">
              📄 Download CSV
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="card">
          <div className="card-header"><div className="section-title">Quick Links</div></div>
          <div className="card-body">
            <div className="flex flex-wrap gap-2">
              {[
                { label: "👥 Employees",   href: "/admin/employees" },
                { label: "📋 Attendance",  href: "/admin/attendance" },
                { label: "⚙️ Shifts",      href: "/admin/shifts" },
                { label: "🏖️ Leave",       href: "/admin/leave" },
                { label: "🔑 Admin Users", href: "/admin/admins" },
                { label: "🛠️ Settings",    href: "/admin/settings" },
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
