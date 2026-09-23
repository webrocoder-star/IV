"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ShiftOption { shiftLabel: string; colorHex: string | null; }
interface RecentRecord { date: string; sapId: string; workLocation: string; shift: string; status: string; }

// Safe fetch with timeout
async function safeFetch(url: string, options?: RequestInit, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(tid);
  }
}

function getWeekNumber(now: Date): number {
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
}

function getFinancialYear(now: Date): string {
  return now.getMonth() >= 3
    ? `${now.getFullYear()}-${now.getFullYear() + 1}`
    : `${now.getFullYear() - 1}-${now.getFullYear()}`;
}

export default function EmployeePortal() {
  const [weekNumber, setWeekNumber] = useState(0);
  const [financialYear, setFinancialYear] = useState("");
  const [todayStr, setTodayStr] = useState("");
  const [sapIdInput, setSapIdInput] = useState("");
  const [validSapId, setValidSapId] = useState("");
  const [maskedSapId, setMaskedSapId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [workLocation, setWorkLocation] = useState<"WFO" | "WFH" | "">("");
  const [selectedShift, setSelectedShift] = useState("");
  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  const [step, setStep] = useState<"input" | "form" | "done">("input");
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const now = new Date();
    setWeekNumber(getWeekNumber(now));
    setFinancialYear(getFinancialYear(now));
    setTodayStr(now.toLocaleDateString("en-GB", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric"
    }));
    // Fetch shifts on load
    safeFetch("/api/employee/shifts")
      .then(r => r.json())
      .then(d => { if (d.success && d.data) setShifts(d.data); })
      .catch(() => {}); // fail silently
  }, []);

  const fetchRecent = useCallback(async (sapId: string) => {
    try {
      const res = await safeFetch(`/api/employee/attendance?sapId=${encodeURIComponent(sapId)}&limit=10`);
      const data = await res.json();
      if (data.success && data.data) setRecentRecords(data.data);
    } catch {
      // fail silently — recent records are not critical
    }
  }, []);

  const handleValidate = async () => {
    const trimmed = sapIdInput.trim();
    if (!trimmed) { setValidationError("Please enter your SAP ID."); return; }
    setValidationError("");
    setIsValidating(true);
    try {
      const res = await safeFetch("/api/employee/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sapId: trimmed }),
      });
      const data = await res.json();
      if (data.success) {
        setValidSapId(trimmed);
        setMaskedSapId(data.maskedSapId);
        setEmployeeName(data.employeeName ?? "");
        if (data.defaultShift) setSelectedShift(data.defaultShift);
        fetchRecent(trimmed);
        setStep("form");
      } else {
        setValidationError(data.error || "Validation failed. Please try again.");
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        setValidationError("Request timed out. Please check your connection.");
      } else {
        setValidationError("Connection error. Please try again.");
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!workLocation) { setSubmitError("Please select Work From Office or Work From Home."); return; }
    if (!selectedShift) { setSubmitError("Please select a shift."); return; }
    setSubmitError("");
    setIsSubmitting(true);
    try {
      const res = await safeFetch("/api/employee/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sapId: validSapId, attendanceType: workLocation, shift: selectedShift }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || "Attendance submitted successfully!");
        fetchRecent(validSapId);
        setStep("done");
      } else {
        setSubmitError(data.error || "Submission failed. Please try again.");
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        setSubmitError("Request timed out. Please check your connection and try again.");
      } else {
        setSubmitError("Connection error. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSapIdInput(""); setValidSapId(""); setMaskedSapId(""); setEmployeeName("");
    setWorkLocation(""); setSelectedShift(""); setValidationError("");
    setSubmitError(""); setSuccessMsg(""); setStep("input");
  };

  return (
    <div className="portal-page">
      {/* ===== HEADER ===== */}
      <header className="portal-header">
        <div className="portal-header-logo">
          <div className="portal-header-logo-icon">IV</div>
          <div>
            <div className="portal-header-title">IV ATTENDANCE TRACKER</div>
            <div className="portal-header-sub">Employee Attendance Portal</div>
          </div>
        </div>
        <div className="portal-header-meta">
          {weekNumber > 0 && <div className="portal-header-badge">Week: {weekNumber}</div>}
          {financialYear && <div className="portal-header-badge">FY {financialYear}</div>}
          <Link href="/admin/login" className="btn btn-secondary btn-sm" style={{ fontSize: "0.75rem" }}>
            🔐 Admin Login
          </Link>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="portal-content">

        {/* ---- LEFT: MARK ATTENDANCE ---- */}
        <div className="card">
          <div className="card-header" style={{ background: "var(--primary-soft)" }}>
            <div>
              <div className="section-title" style={{ color: "var(--primary)" }}>Mark Attendance</div>
              <div className="hint">{todayStr}</div>
            </div>
            <span style={{ fontSize: "1.3rem" }}>✅</span>
          </div>

          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* ---- SUCCESS STATE ---- */}
            {step === "done" && (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🎉</div>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--green-text)", marginBottom: "6px" }}>
                  Attendance Submitted!
                </div>
                <div className="hint" style={{ marginBottom: "4px" }}>{successMsg}</div>
                <div className="hint">
                  SAP: <strong>{maskedSapId}</strong> · {workLocation} · {selectedShift}
                </div>
                <button onClick={handleReset} className="btn btn-outline btn-sm" style={{ marginTop: "16px" }}>
                  ← Submit Another
                </button>
              </div>
            )}

            {/* ---- FORM STEPS ---- */}
            {step !== "done" && (
              <>
                {/* Step 1: SAP ID */}
                <div className="form-group">
                  <label className="form-label">SAP ID</label>
                  {step === "input" ? (
                    <>
                      <div className="flex gap-2">
                        <input
                          id="sap-id-input"
                          className="form-control"
                          type="text"
                          value={sapIdInput}
                          onChange={e => setSapIdInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleValidate()}
                          placeholder="Enter your SAP ID"
                          maxLength={20}
                          disabled={isValidating}
                          autoFocus
                        />
                        <button
                          id="validate-btn"
                          className="btn btn-primary"
                          onClick={handleValidate}
                          disabled={isValidating}
                          style={{ flexShrink: 0 }}
                        >
                          {isValidating
                            ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "#fff" }} />Checking…</>
                            : "Validate"
                          }
                        </button>
                      </div>
                      {validationError && (
                        <div className="alert alert-error" style={{ marginTop: "8px" }}>
                          <span>⚠️</span>{validationError}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="form-control flex items-center gap-2" style={{ background: "var(--green-bg)", borderColor: "var(--accent)", cursor: "default", flexShrink: 1, minWidth: 0 }}>
                        <span style={{ color: "var(--green-text)" }}>✅</span>
                        <span style={{ fontWeight: 700, fontFamily: "monospace", color: "var(--green-text)" }}>{maskedSapId}</span>
                        {employeeName && (
                          <span className="hint" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            — {employeeName}
                          </span>
                        )}
                      </div>
                      <button onClick={handleReset} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
                        Change
                      </button>
                    </div>
                  )}
                </div>

                {/* Step 2: Work Location */}
                {step === "form" && (
                  <div className="form-group">
                    <label className="form-label">Work Location</label>
                    <div className="flex gap-3">
                      <button
                        id="wfo-btn"
                        className={`location-btn ${workLocation === "WFO" ? "active" : ""}`}
                        onClick={() => setWorkLocation("WFO")}
                      >
                        <span className="icon">🏢</span>
                        <span>Work From Office</span>
                      </button>
                      <button
                        id="wfh-btn"
                        className={`location-btn ${workLocation === "WFH" ? "active" : ""}`}
                        onClick={() => setWorkLocation("WFH")}
                      >
                        <span className="icon">🏠</span>
                        <span>Work From Home</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Shift */}
                {step === "form" && (
                  <div className="form-group">
                    <label className="form-label">Select Shift</label>
                    <select
                      id="shift-select"
                      className="form-control"
                      value={selectedShift}
                      onChange={e => setSelectedShift(e.target.value)}
                    >
                      <option value="">— Select Shift —</option>
                      {shifts.length > 0
                        ? shifts.map(s => <option key={s.shiftLabel} value={s.shiftLabel}>{s.shiftLabel}</option>)
                        : <option disabled>No shifts configured — contact admin</option>
                      }
                    </select>
                  </div>
                )}

                {/* Submit Error */}
                {submitError && (
                  <div className="alert alert-error">
                    <span>⚠️</span>
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Submit Button */}
                {step === "form" && (
                  <button
                    id="submit-btn"
                    className="btn btn-success btn-xl w-full"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)", borderTopColor: "#fff" }} />Submitting…</>
                      : "✅ SUBMIT ATTENDANCE"
                    }
                  </button>
                )}

                {step === "form" && (
                  <div className="hint" style={{ textAlign: "center" }}>
                    ℹ️ Attendance can only be marked once per day.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ---- RIGHT: RECENT LOGIN DETAILS ---- */}
        <div className="card">
          <div className="card-header">
            <div className="section-title">Recent Attendance Details</div>
            {recentRecords.length > 0 && (
              <span className="badge badge-green">{recentRecords.length} Records</span>
            )}
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>SAP ID</th>
                  <th>Shift</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.length === 0 ? (
                  <tr className="no-data">
                    <td colSpan={5}>
                      <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <div className="empty-state-text">
                          Validate your SAP ID to view recent attendance history.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentRecords.map((rec, i) => (
                    <tr key={i}>
                      <td>{rec.date}</td>
                      <td><span style={{ fontFamily: "monospace", fontWeight: 700 }}>{rec.sapId}</span></td>
                      <td>{rec.shift}</td>
                      <td>
                        <span className={`badge ${rec.workLocation === "WFO" ? "badge-blue" : "badge-green"}`}>
                          {rec.workLocation === "WFO" ? "🏢 WFO" : "🏠 WFH"}
                        </span>
                      </td>
                      <td><span className="badge badge-green">{rec.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="portal-footer">
        © {new Date().getFullYear()} IV Attendance Tracker — Internal HR System · All rights reserved
      </footer>
    </div>
  );
}
