"use client";

import { useEffect, useState } from "react";

export default function LeavePage() {
  const [loading, setLoading] = useState(true);

  // Since leave functionality is likely a placeholder for future complex HR features, 
  // we will build a visual shell that can be wired up later, matching the theme.

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Leave & Holidays</h1>
          <p>Manage employee leaves and public holidays</p>
        </div>
        <button className="btn btn-primary" disabled>+ Add Leave Record</button>
      </div>

      <div className="grid grid-2 gap-4">
        {/* Leave Records Placeholder */}
        <div className="card">
          <div className="card-header">
            <div className="section-title">Leave Records (Coming Soon)</div>
          </div>
          <div className="table-wrapper">
            {loading ? <div className="loading-center"><div className="spinner" /></div> : (
              <table className="data-table">
                <thead><tr><th>Employee</th><th>Dates</th><th>Type</th><th>Status</th></tr></thead>
                <tbody>
                  <tr className="no-data"><td colSpan={4}>
                    <div className="empty-state">
                      <div className="empty-state-icon">🏖️</div>
                      <div className="empty-state-text">Leave management module is under construction.</div>
                    </div>
                  </td></tr>
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Public Holidays Placeholder */}
        <div className="card">
          <div className="card-header">
            <div className="section-title">Public Holidays (Coming Soon)</div>
            <button className="btn btn-outline btn-sm" disabled>+ Add Holiday</button>
          </div>
          <div className="table-wrapper">
            {loading ? <div className="loading-center"><div className="spinner" /></div> : (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Holiday Name</th></tr></thead>
                <tbody>
                  <tr className="no-data"><td colSpan={2}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📅</div>
                      <div className="empty-state-text">Holiday calendar module is under construction.</div>
                    </div>
                  </td></tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
