import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

interface ShiftChangeRequestEmailParams {
  employeeName: string;
  sapId: string;
  maskedSapId: string;
  requestedDate: string;
  currentShift: string;
  requestedShift: string;
  reason: string;
  tlName: string;
  tlEmail: string;
}

interface ShiftChangeDecisionEmailParams {
  employeeName: string;
  maskedSapId: string;
  requestedDate: string;
  requestedShift: string;
  status: "approved" | "denied";
  rejectionReason?: string;
  tlEmail: string;
  tlName: string;
}

export async function sendShiftChangeRequestEmail(params: ShiftChangeRequestEmailParams) {
  const { employeeName, maskedSapId, requestedDate, currentShift, requestedShift, reason, tlName, tlEmail } = params;

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f5f5f5; padding: 24px;">
      <div style="background: #1b5e20; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0; display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 20px;">📋</span>
        <div>
          <div style="font-size: 16px; font-weight: 700;">IV ATTENDANCE TRACKER</div>
          <div style="font-size: 12px; opacity: 0.8;">Shift Change Request — Action Required</div>
        </div>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
        <p style="color: #555; margin: 0 0 16px;">Dear <strong>${tlName}</strong>,</p>
        <p style="color: #555; margin: 0 0 20px;">A shift change request has been submitted and requires your review:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background: #f1f8f1;">
            <td style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #1b5e20; text-transform: uppercase; width: 40%; border: 1px solid #c8e6c9;">Employee</td>
            <td style="padding: 10px 14px; font-size: 13px; color: #1a1a1a; border: 1px solid #c8e6c9;">${employeeName} (${maskedSapId})</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #1b5e20; text-transform: uppercase; border: 1px solid #e0e0e0;">Requested Date</td>
            <td style="padding: 10px 14px; font-size: 13px; color: #1a1a1a; border: 1px solid #e0e0e0;">${requestedDate}</td>
          </tr>
          <tr style="background: #f1f8f1;">
            <td style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #1b5e20; text-transform: uppercase; border: 1px solid #c8e6c9;">Current Shift</td>
            <td style="padding: 10px 14px; font-size: 13px; color: #1a1a1a; border: 1px solid #c8e6c9;">${currentShift}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #1b5e20; text-transform: uppercase; border: 1px solid #e0e0e0;">Requested Shift</td>
            <td style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: #2e7d32; border: 1px solid #e0e0e0;">${requestedShift}</td>
          </tr>
          <tr style="background: #f1f8f1;">
            <td style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #1b5e20; text-transform: uppercase; border: 1px solid #c8e6c9;">Reason</td>
            <td style="padding: 10px 14px; font-size: 13px; color: #1a1a1a; border: 1px solid #c8e6c9;">${reason}</td>
          </tr>
        </table>
        
        <p style="color: #888; font-size: 12px; margin: 0;">Please log in to the Admin Portal to approve or deny this request.</p>
      </div>
      <p style="text-align: center; color: #aaa; font-size: 11px; margin-top: 16px;">IV Attendance Tracker — Internal HR System</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: tlEmail,
      subject: `Shift Change Request — ${employeeName} (${maskedSapId}) for ${requestedDate}`,
      html,
    });
  } catch (error) {
    console.error("Failed to send shift change request email:", error);
  }
}

export async function sendShiftChangeDecisionEmail(params: ShiftChangeDecisionEmailParams) {
  const { employeeName, maskedSapId, requestedDate, requestedShift, status, rejectionReason, tlEmail, tlName } = params;

  const isApproved = status === "approved";
  const statusColor = isApproved ? "#2e7d32" : "#c62828";
  const statusBg    = isApproved ? "#e8f5e9" : "#ffebee";
  const statusLabel = isApproved ? "✅ APPROVED" : "❌ DENIED";

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f5f5f5; padding: 24px;">
      <div style="background: #1b5e20; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <div style="font-size: 16px; font-weight: 700;">IV ATTENDANCE TRACKER</div>
        <div style="font-size: 12px; opacity: 0.8;">Shift Change Request — Decision</div>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
        <p style="color: #555; margin: 0 0 16px;">Dear <strong>${tlName}</strong>,</p>
        <p style="color: #555; margin: 0 0 20px;">The shift change request for <strong>${employeeName} (${maskedSapId})</strong> has been processed:</p>
        
        <div style="background: ${statusBg}; border: 1px solid ${statusColor}; border-radius: 8px; padding: 14px 20px; text-align: center; margin-bottom: 20px;">
          <span style="color: ${statusColor}; font-size: 16px; font-weight: 800;">${statusLabel}</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background: #f1f8f1;">
            <td style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #1b5e20; text-transform: uppercase; width: 40%; border: 1px solid #c8e6c9;">Requested Date</td>
            <td style="padding: 10px 14px; font-size: 13px; border: 1px solid #c8e6c9;">${requestedDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #1b5e20; text-transform: uppercase; border: 1px solid #e0e0e0;">Requested Shift</td>
            <td style="padding: 10px 14px; font-size: 13px; border: 1px solid #e0e0e0;">${requestedShift}</td>
          </tr>
          ${!isApproved && rejectionReason ? `
          <tr style="background: #f1f8f1;">
            <td style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #c62828; text-transform: uppercase; border: 1px solid #ffcdd2;">Reason for Denial</td>
            <td style="padding: 10px 14px; font-size: 13px; color: #c62828; border: 1px solid #ffcdd2;">${rejectionReason}</td>
          </tr>` : ""}
        </table>
        
        <p style="color: #888; font-size: 12px; margin: 0;">For questions, contact your HR administrator.</p>
      </div>
      <p style="text-align: center; color: #aaa; font-size: 11px; margin-top: 16px;">IV Attendance Tracker — Internal HR System</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: tlEmail,
      subject: `Shift Change ${isApproved ? "Approved" : "Denied"} — ${employeeName} (${maskedSapId})`,
      html,
    });
  } catch (error) {
    console.error("Failed to send shift change decision email:", error);
  }
}
