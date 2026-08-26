import ExcelJS from "exceljs";
import { prisma } from "./prisma";
import { isWeekend } from "./week-calculator";

// ============================================================
// SHIFT COLOR MAPPING (matches reference template Images 2 & 3)
// ============================================================

const SHIFT_COLORS: Record<string, { bg: string; font: string }> = {
  "10 AM - 7 PM": { bg: "FF92D050", font: "FF000000" },   // Green
  "2 PM - 11 PM": { bg: "FFFF99CC", font: "FF000000" },   // Pink/Salmon
  "5 AM - 2 PM":  { bg: "FFFFFF00", font: "FF000000" },   // Yellow
  "9 PM - 6 AM":  { bg: "FF00B0F0", font: "FF000000" },   // Teal/Cyan
  "6 PM - 3 AM":  { bg: "FF0070C0", font: "FFFFFFFF" },   // Dark Blue (white text)
  "9 AM - 6 PM":  { bg: "FFE2EFDA", font: "FF000000" },   // Light green
  "WEEKEND":      { bg: "FFD9D9D9", font: "FF666666" },   // Grey
  "Leave":        { bg: "FFFFFF00", font: "FF000000" },   // Yellow
  "WEEKOFF":      { bg: "FFFFC000", font: "FF000000" },   // Orange
  "NA":           { bg: "FFFFD7D7", font: "FF999999" },   // Light red
};

function getShiftColor(shift: string): { bg: string; font: string } {
  // Normalize shift label for matching
  const normalized = shift?.trim();
  return SHIFT_COLORS[normalized] ?? { bg: "FFFFFFFF", font: "FF000000" };
}

function applyHeaderStyle(cell: ExcelJS.Cell) {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F3864" }, // Dark navy
  };
  cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10, name: "Calibri" };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
}

function applyDataCellStyle(cell: ExcelJS.Cell, shiftLabel: string) {
  const colors = getShiftColor(shiftLabel);
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colors.bg },
  };
  cell.font = { color: { argb: colors.font }, size: 10, name: "Calibri" };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
}

// ============================================================
// GENERATE DATE RANGE
// ============================================================

function getDatesInRange(fromDate: Date, toDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(fromDate);
  while (current <= toDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// ============================================================
// EXCEL EXPORT
// ============================================================

export async function generateAttendanceExcel(
  fromDate: Date,
  toDate: Date
): Promise<Buffer> {
  // Fetch all attendance records for the period
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      attendanceDate: {
        gte: fromDate,
        lte: toDate,
      },
    },
    include: {
      employee: {
        select: { employeeName: true, sapId: true },
      },
    },
    orderBy: [{ sapId: "asc" }, { attendanceDate: "asc" }],
  });

  // Fetch approved leaves for the period
  const leaveRecords = await prisma.leaveRecord.findMany({
    where: {
      leaveDate: { gte: fromDate, lte: toDate },
      status: "approved",
    },
  });

  // Fetch holidays for the period
  const holidays = await prisma.holiday.findMany({
    where: {
      holidayDate: { gte: fromDate, lte: toDate },
    },
  });

  const holidayDates = new Set(holidays.map((h) => h.holidayDate.toISOString().split("T")[0]));
  const leaveMap = new Map<string, string>();
  leaveRecords.forEach((l) => {
    const key = `${l.sapId}_${l.leaveDate.toISOString().split("T")[0]}`;
    leaveMap.set(key, "Leave");
  });

  // Group attendance by SAP ID
  const attendanceMap = new Map<string, Map<string, string>>();
  const employeeInfo = new Map<string, string>();

  attendanceRecords.forEach((rec) => {
    const dateStr = rec.attendanceDate.toISOString().split("T")[0];
    if (!attendanceMap.has(rec.sapId)) {
      attendanceMap.set(rec.sapId, new Map());
    }
    attendanceMap.get(rec.sapId)!.set(dateStr, rec.shift);
    employeeInfo.set(rec.sapId, rec.employee.employeeName);
  });

  // Get all unique SAP IDs
  const allEmployees = await prisma.employee.findMany({
    where: { status: "active" },
    orderBy: { employeeName: "asc" },
    select: { sapId: true, employeeName: true },
  });

  const dates = getDatesInRange(fromDate, toDate);

  // ============================================================
  // BUILD WORKBOOK
  // ============================================================
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IV Attendance Tracker";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Attendance", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
    },
  });

  // ============================================================
  // ROW 1: Column Headers
  // ============================================================
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const headerRow1: (string | number)[] = ["SAP ID", "Name"];
  const headerRow2: string[] = ["", ""];

  dates.forEach((d) => {
    const day = d.getDate();
    const month = MONTH_NAMES[d.getMonth()];
    const dayName = DAY_NAMES[d.getDay()];
    headerRow1.push(`${day}-${month}`);
    headerRow2.push(dayName);
  });

  // Row 1 — Date headers
  const row1 = ws.addRow(headerRow1);
  row1.eachCell((cell, colNum) => {
    applyHeaderStyle(cell);
    if (colNum === 1) ws.getColumn(colNum).width = 14;
    if (colNum === 2) ws.getColumn(colNum).width = 22;
    if (colNum > 2) ws.getColumn(colNum).width = 16;
  });
  row1.height = 28;

  // Row 2 — Day names
  const row2 = ws.addRow(headerRow2);
  row2.eachCell((cell) => {
    applyHeaderStyle(cell);
    // Override: slightly lighter for sub-header
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2E5090" },
    };
  });
  row2.height = 22;

  // ============================================================
  // DATA ROWS: one row per employee
  // ============================================================
  allEmployees.forEach((emp) => {
    const empAttendance = attendanceMap.get(emp.sapId) ?? new Map();
    const rowData: (string | number)[] = [emp.sapId, emp.employeeName];

    dates.forEach((d) => {
      const dateStr = d.toISOString().split("T")[0];
      const leaveKey = `${emp.sapId}_${dateStr}`;

      if (isWeekend(d)) {
        rowData.push("WEEKEND");
      } else if (holidayDates.has(dateStr)) {
        rowData.push("WEEKEND");
      } else if (leaveMap.has(leaveKey)) {
        rowData.push("Leave");
      } else {
        const shift = empAttendance.get(dateStr);
        rowData.push(shift ?? "");
      }
    });

    const dataRow = ws.addRow(rowData);
    dataRow.height = 20;

    dataRow.eachCell((cell, colNum) => {
      if (colNum <= 2) {
        // SAP ID and Name columns
        cell.font = { size: 10, name: "Calibri" };
        cell.alignment = { horizontal: "left", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      } else {
        const cellValue = String(cell.value ?? "");
        applyDataCellStyle(cell, cellValue);
      }
    });
  });

  // ============================================================
  // FREEZE PANES
  // ============================================================
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: 2 }];

  // ============================================================
  // AUTO FILTER
  // ============================================================
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 2 + dates.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ============================================================
// CSV EXPORT
// ============================================================

export async function generateAttendanceCsv(
  fromDate: Date,
  toDate: Date
): Promise<string> {
  const records = await prisma.attendance.findMany({
    where: {
      attendanceDate: {
        gte: fromDate,
        lte: toDate,
      },
    },
    include: {
      employee: {
        select: { employeeName: true, tlName: true },
      },
    },
    orderBy: [{ attendanceDate: "asc" }, { sapId: "asc" }],
  });

  const header = ["Date", "SAP ID", "Employee Name", "Work Type", "Shift", "TL Name", "Status"];
  const rows = records.map((rec) => [
    rec.attendanceDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(/ /g, "-"),
    rec.sapId,
    rec.employee.employeeName,
    rec.attendanceType,
    rec.shift,
    rec.employee.tlName ?? "",
    "Submitted",
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");

  return csv;
}
