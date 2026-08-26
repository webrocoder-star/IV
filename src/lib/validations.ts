import { z } from "zod";

// ============================================================
// EMPLOYEE PORTAL SCHEMAS
// ============================================================

export const ValidateSapIdSchema = z.object({
  sapId: z
    .string()
    .min(1, "SAP ID is required")
    .max(20, "SAP ID too long")
    .regex(/^[a-zA-Z0-9]+$/, "SAP ID must be alphanumeric"),
});

export const SubmitAttendanceSchema = z.object({
  sapId: z.string().min(1, "SAP ID is required"),
  attendanceType: z.enum(["WFO", "WFH"]),
  shift: z.string().min(1, "Please select a shift"),
  attendanceDate: z.string().optional(), // ISO date string, defaults to today
});

export const ShiftChangeRequestSchema = z.object({
  sapId: z.string().min(1, "SAP ID is required"),
  requestedDate: z.string().min(1, "Requested date is required"),
  requestedShift: z.string().min(1, "Requested shift is required"),
  reason: z.string().min(5, "Please provide a reason (min 5 characters)"),
});

// ============================================================
// ADMIN EMPLOYEE MANAGEMENT SCHEMAS
// ============================================================

export const CreateEmployeeSchema = z.object({
  sapId: z
    .string()
    .min(1, "SAP ID is required")
    .max(20, "SAP ID too long")
    .regex(/^[a-zA-Z0-9]+$/, "SAP ID must be alphanumeric"),
  employeeName: z.string().min(1, "Employee name is required").max(255),
  defaultShift: z.string().optional(),
  tlName: z.string().optional(),
  tlEmail: z.string().email("Invalid TL email").optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial().extend({
  id: z.number().int().positive(),
});

// ============================================================
// ADMIN USER MANAGEMENT SCHEMAS
// ============================================================

export const CreateAdminSchema = z.object({
  adminName: z.string().min(1, "Admin name is required"),
  loginId: z
    .string()
    .min(3, "Login ID must be at least 3 characters")
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, "Login ID: letters, numbers, underscores only"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  role: z.enum(["main_admin", "admin"]).default("admin"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const UpdateAdminSchema = z.object({
  id: z.number().int().positive(),
  adminName: z.string().min(1).optional(),
  loginId: z.string().min(3).optional(),
  role: z.enum(["main_admin", "admin"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const ResetPasswordSchema = z.object({
  id: z.number().int().positive(),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

// ============================================================
// SHIFT MANAGEMENT SCHEMAS
// ============================================================

export const CreateShiftSchema = z.object({
  shiftLabel: z.string().min(1, "Shift label is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

// ============================================================
// LEAVE & HOLIDAY SCHEMAS
// ============================================================

export const CreateHolidaySchema = z.object({
  holidayDate: z.string().min(1, "Date is required"),
  holidayName: z.string().min(1, "Holiday name is required"),
});

export const CreateLeaveSchema = z.object({
  sapId: z.string().min(1, "SAP ID is required"),
  leaveDate: z.string().min(1, "Leave date is required"),
  leaveType: z.string().min(1, "Leave type is required"),
  status: z.enum(["pending", "approved", "denied"]).default("approved"),
});

// ============================================================
// SHIFT REQUEST SCHEMAS
// ============================================================

export const ApproveShiftRequestSchema = z.object({
  id: z.number().int().positive(),
  action: z.enum(["approved", "denied"]),
  rejectionReason: z.string().optional(),
  approvedBy: z.string().optional(),
});

// ============================================================
// EXPORT SCHEMAS
// ============================================================

export const ExportAttendanceSchema = z.object({
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
  format: z.enum(["excel", "csv"]).default("excel"),
});

// ============================================================
// SETTINGS SCHEMAS
// ============================================================

export const SmtpSettingsSchema = z.object({
  smtp_host: z.string(),
  smtp_port: z.string(),
  smtp_user: z.string(),
  smtp_pass: z.string(),
  smtp_from: z.string().email("Invalid from email").or(z.literal("")),
});
