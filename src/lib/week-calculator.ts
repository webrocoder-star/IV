/**
 * Week Calculator for IV Attendance Tracker
 * Returns the calendar week number of the year (Jan 1 = Week 1)
 * and the financial year string (e.g., "2025 - 2026")
 */

/**
 * Get the ISO week number for a given date (Mon-Sun weeks, Jan 1 = Week 1 if it falls Mon-Thu)
 * For simplicity, using a straightforward calendar-week approach (Jan 1 = Week 1)
 */
export function getCalendarWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
}

/**
 * Returns the financial year string for India-style April-March FY
 * e.g., for Aug 2025 → "2025 - 2026"
 * e.g., for Feb 2026 → "2025 - 2026"
 */
export function getFinancialYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  if (month >= 4) {
    // April onwards = current FY
    return `${year} - ${year + 1}`;
  } else {
    // Jan-March = previous FY
    return `${year - 1} - ${year}`;
  }
}

/**
 * Returns week number and financial year for display in the header
 */
export function getHeaderInfo(date: Date = new Date()): {
  weekNumber: number;
  financialYear: string;
} {
  return {
    weekNumber: getCalendarWeekNumber(date),
    financialYear: getFinancialYear(date),
  };
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0=Sunday, 6=Saturday
}

/**
 * Get previous working day (excludes weekends only - holidays/leaves checked separately)
 * Returns null if it's Monday and we look at Friday
 */
export function getPreviousWorkingDay(date: Date): Date {
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);

  // Skip weekends
  while (isWeekend(prev)) {
    prev.setDate(prev.getDate() - 1);
  }

  return prev;
}

/**
 * Format date as DD-MMM-YYYY (e.g., 26-Aug-2026)
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(/ /g, "-");
}

/**
 * Format date as YYYY-MM-DD for database queries
 */
export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Parse a date string (YYYY-MM-DD) and return midnight UTC date
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
