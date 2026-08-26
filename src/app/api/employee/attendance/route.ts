import { NextRequest, NextResponse } from "next/server";
import { validateAndSubmitAttendance, maskSapId } from "@/lib/business-rules";
import { SubmitAttendanceSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

// POST — Submit attendance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SubmitAttendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { sapId, attendanceType, shift, attendanceDate } = parsed.data;

    // Parse date or use today
    let date: Date;
    if (attendanceDate) {
      const parts = attendanceDate.split("-").map(Number);
      date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    } else {
      const now = new Date();
      date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    }

    const result = await validateAndSubmitAttendance({
      sapId,
      attendanceType,
      shift,
      attendanceDate: date,
    });

    if (!result.success) {
      const statusCode = result.code === "DUPLICATE" ? 409 : 
                         result.code === "SERVER_ERROR" ? 500 : 400;
      return NextResponse.json(
        { success: false, error: result.error, code: result.code },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Attendance submitted successfully!",
    });
  } catch (error) {
    console.error("attendance POST error:", error);
    return NextResponse.json(
      { success: false, error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}

// GET — Get recent attendance for employee (by SAP ID query param)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sapId = searchParams.get("sapId");
    const limit = parseInt(searchParams.get("limit") ?? "10");

    if (!sapId) {
      return NextResponse.json(
        { success: false, error: "SAP ID required" },
        { status: 400 }
      );
    }

    const records = await prisma.attendance.findMany({
      where: { sapId },
      orderBy: { attendanceDate: "desc" },
      take: limit,
      select: {
        attendanceDate: true,
        attendanceType: true,
        shift: true,
      },
    });

    // NEVER expose full SAP ID — always mask
    const masked = maskSapId(sapId);

    const data = records.map((rec) => ({
      date: rec.attendanceDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).replace(/ /g, "-"),
      sapId: masked,
      workLocation: rec.attendanceType,
      shift: rec.shift,
      status: "Submitted",
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("attendance GET error:", error);
    return NextResponse.json(
      { success: false, error: "Server error." },
      { status: 500 }
    );
  }
}
