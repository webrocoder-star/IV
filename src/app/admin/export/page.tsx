"use client";

import { useState } from "react";

export default function ExportPage() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Export Attendance</h1>
          <p>Download attendance reports in Excel or CSV format</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <div className="card-header">
          <div className="section-title">Generate Report</div>
        </div>
        <div className="card-body">
          <div className="grid grid-2 gap-4 mb-6">
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input type="date" className="form-control" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
          </div>
          
          <div className="divider" style={{ margin: "20px 0" }} />
          
          <div className="grid grid-2 gap-4">
            <a 
              href={`/api/admin/export?fromDate=${fromDate}&toDate=${toDate}&format=excel`} 
              className="btn btn-success btn-xl flex flex-col items-center justify-center gap-2"
              style={{ height: 100 }}
            >
              <span style={{ fontSize: "2rem" }}>📊</span>
              <span>Download Excel (.xlsx)</span>
            </a>
            <a 
              href={`/api/admin/export?fromDate=${fromDate}&toDate=${toDate}&format=csv`} 
              className="btn btn-outline btn-xl flex flex-col items-center justify-center gap-2"
              style={{ height: 100 }}
            >
              <span style={{ fontSize: "2rem" }}>📄</span>
              <span>Download CSV (.csv)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
