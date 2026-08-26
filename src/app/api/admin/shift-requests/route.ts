import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ShiftChangeRequestSchema, ApproveShiftRequestSchema } from "@/lib/validations";
import { sendShiftChangeRequestEmail, sendShiftChangeDecisionEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where = status ? { status: status as any } : {};

  try {
    const requests = await prisma.shiftChangeRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    console.error("shift-requests GET error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Employee portal can create shift requests without being authenticated as Admin
  try {
    const body = await request.json();
    const parsed = ShiftChangeRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { sapId, requestedDate, requestedShift, reason } = parsed.data;

    // Get employee details
    const employee = await prisma.employee.findUnique({
      where: { sapId }
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
    }

    const reqDate = new Date(requestedDate);
    
    // Check if attendance already exists
    const existingAttendance = await prisma.attendance.findFirst({
      where: { sapId, attendanceDate: reqDate }
    });

    const currentShift = existingAttendance?.shift || employee.defaultShift || "None";

    const shiftRequest = await prisma.shiftChangeRequest.create({
      data: {
        sapId,
        employeeName: employee.employeeName,
        requestedDate: reqDate,
        currentShift,
        requestedShift,
        reason,
        tlName: employee.tlName,
        tlEmail: employee.tlEmail,
        status: "pending"
      }
    });

    // Send email notification to TL if tlEmail exists
    if (employee.tlEmail) {
       await sendShiftChangeRequestEmail({
         employeeName: employee.employeeName,
         sapId: sapId,
         maskedSapId: "***" + sapId.slice(-3),
         requestedDate: reqDate.toLocaleDateString(),
         currentShift: currentShift,
         requestedShift: requestedShift,
         reason: reason,
         tlName: employee.tlName || "Team Leader",
         tlEmail: employee.tlEmail
       });
    }

    return NextResponse.json({ success: true, data: shiftRequest }, { status: 201 });
  } catch (error) {
    console.error("shift-requests POST error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = ApproveShiftRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { id, action, rejectionReason, approvedBy } = parsed.data;

    const existingRequest = await prisma.shiftChangeRequest.findUnique({
      where: { id }
    });

    if (!existingRequest) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    const updatedRequest = await prisma.shiftChangeRequest.update({
      where: { id },
      data: {
        status: action,
        rejectionReason: action === "denied" ? rejectionReason : null,
        approvedBy: action === "approved" ? approvedBy : null,
        approvedAt: action === "approved" ? new Date() : null
      }
    });

    // If approved, update attendance record if it exists
    if (action === "approved") {
      const attendance = await prisma.attendance.findFirst({
        where: { sapId: existingRequest.sapId, attendanceDate: existingRequest.requestedDate }
      });

      if (attendance) {
        await prisma.attendance.update({
          where: { id: attendance.id },
          data: { shift: existingRequest.requestedShift }
        });
      }
    }
    
    // Send email notification of decision
    if (existingRequest.tlEmail) {
        await sendShiftChangeDecisionEmail({
            employeeName: existingRequest.employeeName,
            maskedSapId: "***" + existingRequest.sapId.slice(-3),
            requestedDate: existingRequest.requestedDate.toLocaleDateString(),
            requestedShift: existingRequest.requestedShift,
            status: action as "approved" | "denied",
            rejectionReason: rejectionReason,
            tlEmail: existingRequest.tlEmail,
            tlName: existingRequest.tlName || "Team Leader"
        });
    }

    return NextResponse.json({ success: true, data: updatedRequest });
  } catch (error) {
    console.error("shift-requests PUT error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}