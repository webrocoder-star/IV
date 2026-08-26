"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>System Settings</h1>
          <p>Configure global application settings</p>
        </div>
      </div>

      <div className="grid grid-2 gap-4">
        {/* Email Settings Placeholder */}
        <div className="card">
          <div className="card-header">
            <div className="section-title">Email Configuration</div>
          </div>
          <div className="card-body">
            {loading ? <div className="spinner" /> : (
              <div className="flex flex-col gap-4">
                <div className="alert alert-info">
                  <span>ℹ️</span> Email is configured via environment variables (.env).
                </div>
                <div className="form-group">
                  <label className="form-label">Provider</label>
                  <input className="form-control" value="Resend (Serverless)" disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">API Key</label>
                  <input className="form-control" type="password" value="********************************" disabled />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Settings Placeholder */}
        <div className="card">
          <div className="card-header">
            <div className="section-title">General Settings</div>
          </div>
          <div className="card-body">
            {loading ? <div className="spinner" /> : (
              <div className="flex flex-col gap-4">
                <div className="form-group">
                  <label className="form-label">Financial Year Start Month</label>
                  <select className="form-control" defaultValue="4" disabled>
                    <option value="4">April</option>
                    <option value="1">January</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Timezone</label>
                  <input className="form-control" value="Asia/Kolkata (IST)" disabled />
                </div>
                <button className="btn btn-primary w-full" disabled>Save Settings</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
