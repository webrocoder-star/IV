import { prisma } from "./prisma";
import { isWeekend, getPreviousWorkingDay, toDateString } from "./week-calculator";

// ============================================================
// SAP ID MASKING
// ============================================================

/**
 * Masks a SAP ID to show only last 3 digits
 * e.g., "100245" → "***245"
 */
export function maskSapId(sapId: string): string {
  if (sapId.length <= 3) return "***";
  return "***" + sapId.slice(-3);
}

// ============================================================
// EMPLOYEE VALIDATION
// ============================================================

export type EmployeeValidationResult =
  | { success: true; sapId: string; maskedSapId: string; employeeName: string; defaultShift: string | null; tlName: string | null }
  | { success: false; error: string; code: "NOT_FOUND" | "INACTIVE" | "SERVER_ERROR" };

export async function validateEmployee(sapId: string): Promise<EmployeeValidationResult> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { sapId },
      select: {
        sapId: true,
        employeeName: true,
        defaultShift: true,
        tlName: true,
        status: true,
      },
    });

    if (!employee) {
      return {
        success: false,
        error: "User not found. Please contact your administrator.",
        code: "NOT_FOUND",
      };
    }

    if (employee.status === "inactive") {
      return {
        success: false,
        error: "This SAP ID is inactive. Please contact your administrator.",
        code: "INACTIVE",
      };
    }

    return {
      success: true,
      sapId: employee.sapId,
      maskedSapId: maskSapId(employee.sapId),
      employeeName: employee.employeeName,
      defaultShift: employee.defaultShift,
      tlName: employee.tlName,
    };
  } catch (error) {
    console.error("validateEmployee error:", error);
    return {
      success: false,
      error: "Server error. Please try again.",
      code: "SERVER_ERROR",
    };
  }
}

// ============================================================
// DUPLICATE ATTENDANCE CHECK
// ============================================================

export async function checkDuplicateAttendance(
  sapId: string,
  date: Date
): Promise<{ isDuplicate: boolean }> {
  const existing = await prisma.attendance.findFirst({
    where: {
      sapId,
      attendanceDate: date,
    },
  });
  return { isDuplicate: !!existing };
}

// ============================================================
// HOLIDAY CHECK
// ============================================================

export async function isHoliday(date: Date): Promise<boolean> {
  const holiday = await prisma.holiday.findFirst({
    where: { holidayDate: date },
  });
  return !!holiday;
}

// ============================================================
// APPROVED LEAVE CHECK
// ============================================================

export async function isOnApprovedLeave(sapId: string, date: Date): Promise<boolean> {
  const leave = await prisma.leaveRecord.findFirst({
    where: {
      sapId,
      leaveDate: date,
      status: "approved",
    },
  });
  return !!leave;
}

// ============================================================
// PREVIOUS WORKING DAY ATTENDANCE CHECK
// ============================================================

export type PrevDayCheckResult =
  | { blocked: false }
  | { blocked: true; missingDate: string; formattedDate: string };

/**
 * Checks if the employee has attendance for the previous working day.
 * Working day = not weekend, not holiday, not approved leave.
 * If previous day is non-working (holiday/weekend/leave), go back further
 * until we find a real working day or exhaust 30 days back.
 */
export async function checkPreviousDayAttendance(
  sapId: string,
  today: Date
): Promise<PrevDayCheckResult> {
  // Get previous working day (skipping weekends)
  let checkDate = getPreviousWorkingDay(today);
  let attempts = 0;

  // Go back up to 30 days to find the last actual working day
  while (attempts < 30) {
    // If it's a holiday, skip further
    const holiday = await isHoliday(checkDate);
    if (holiday) {
      checkDate = getPreviousWorkingDay(checkDate);
      attempts++;
      continue;
    }

    // If on approved leave, skip further
    const onLeave = await isOnApprovedLeave(sapId, checkDate);
    if (onLeave) {
      checkDate = getPreviousWorkingDay(checkDate);
      attempts++;
      continue;
    }

    // This is a real working day — check if attendance exists
    const existing = await prisma.attendance.findFirst({
      where: {
        sapId,
        attendanceDate: checkDate,
      },
    });

    if (!existing) {
      // No attendance for this working day — block submission
      const formatted = checkDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).replace(/ /g, "-");

      return {
        blocked: true,
        missingDate: toDateString(checkDate),
        formattedDate: formatted,
      };
    }

    // Attendance found — no block
    return { blocked: false };
  }

  // If we go back 30 days and all were non-working, allow
  return { blocked: false };
}

// ============================================================
// SHIFT RESOLUTION
// ============================================================

/**
 * Determines the effective shift for an employee on a given date.
 * Priority: approved shift change request > shift schedule > employee default
 */
export async function resolveShiftForDate(
  sapId: string,
  date: Date
): Promise<string | null> {
  // 1. Check approved shift change request
  const approvedRequest = await prisma.shiftChangeRequest.findFirst({
    where: {
      sapId,
      requestedDate: date,
      status: "approved",
    },
    orderBy: { createdAt: "desc" },
  });

  if (approvedRequest) {
    return approvedRequest.requestedShift;
  }

  // 2. Check shift schedule (weekly/monthly)
  const schedule = await prisma.shiftSchedule.findFirst({
    where: {
      sapId,
      effectiveFrom: { lte: date },
      effectiveTo: { gte: date },
    },
    orderBy: { createdAt: "desc" },
  });

  if (schedule) {
    return schedule.shiftLabel;
  }

  // 3. Fall back to employee default shift
  const employee = await prisma.employee.findUnique({
    where: { sapId },
    select: { defaultShift: true },
  });

  return employee?.defaultShift ?? null;
}

// ============================================================
// FULL ATTENDANCE SUBMISSION VALIDATION
// ============================================================

export type AttendanceSubmitResult =
  | { success: true }
  | { success: false; error: string; code: string };

export async function validateAndSubmitAttendance(data: {
  sapId: string;
  attendanceType: "WFO" | "WFH";
  shift: string;
  attendanceDate?: Date;
}): Promise<AttendanceSubmitResult> {
  const today = data.attendanceDate ?? new Date();
  // Normalize to midnight UTC for date comparisons
  const attendanceDate = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  );

  try {
    // 1. Validate employee
    const empResult = await validateEmployee(data.sapId);
    if (!empResult.success) {
      return { success: false, error: empResult.error, code: empResult.code };
    }

    // 2. Check duplicate
    const { isDuplicate } = await checkDuplicateAttendance(data.sapId, attendanceDate);
    if (isDuplicate) {
      return {
        success: false,
        error: "Attendance already submitted for this date. Duplicate attendance is not allowed.",
        code: "DUPLICATE",
      };
    }

    // 3. Check previous working day (unless today is the very first day possible)
    const prevCheck = await checkPreviousDayAttendance(data.sapId, attendanceDate);
    if (prevCheck.blocked) {
      return {
        success: false,
        error: `Previous attendance is missing for ${prevCheck.formattedDate}. Please complete the previous day's attendance first.`,
        code: "MISSING_PREVIOUS",
      };
    }

    // 4. Save attendance
    await prisma.attendance.create({
      data: {
        sapId: data.sapId,
        attendanceDate,
        attendanceType: data.attendanceType,
        shift: data.shift,
      },
    });

    return { success: true };
  } catch (error: unknown) {
    // Handle unique constraint violation (DB-level duplicate prevention)
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return {
        success: false,
        error: "Attendance already submitted for this date. Duplicate attendance is not allowed.",
        code: "DUPLICATE",
      };
    }
    console.error("validateAndSubmitAttendance error:", error);
    return {
      success: false,
      error: "Server error. Please try again.",
      code: "SERVER_ERROR",
    };
  }
}
