import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const todayStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    // Total active employees
    const totalEmployees = await prisma.employee.count({
      where: { status: "active" },
    });

    // Today's attendance
    const todayAttendance = await prisma.attendance.findMany({
      where: {
        attendanceDate: { gte: todayStart, lte: todayEnd },
      },
      select: { sapId: true, attendanceType: true },
    });

    const todayCount = todayAttendance.length;
    const wfoCount = todayAttendance.filter((a) => a.attendanceType === "WFO").length;
    const whfCount = todayAttendance.filter((a) => a.attendanceType === "WFH").length;
    const missingCount = Math.max(0, totalEmployees - todayCount);

    // On leave today
    const onLeave = await prisma.leaveRecord.count({
      where: {
        leaveDate: todayStart,
        status: "approved",
      },
    });

    // Pending shift change requests
    const pendingRequests = await prisma.shiftChangeRequest.count({
      where: { status: "pending" },
    });

    // Recent attendance (last 10 records today)
    const recentAttendance = await prisma.attendance.findMany({
      where: {
        attendanceDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        employee: { select: { employeeName: true, tlName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Pending shift requests (last 5)
    const shiftRequests = await prisma.shiftChangeRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      stats: {
        totalEmployees,
        todayAttendance: todayCount,
        wfo: wfoCount,
        wfh: whfCount,
        missing: missingCount,
        onLeave,
        pendingRequests,
      },
      recentAttendance: recentAttendance.map((rec) => ({
        date: rec.attendanceDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).replace(/ /g, "-"),
        sapId: rec.sapId,
        maskedSapId: "***" + rec.sapId.slice(-3),
        employeeName: rec.employee.employeeName,
        shift: rec.shift,
        attendanceType: rec.attendanceType,
        tlName: rec.employee.tlName,
        status: "Present",
      })),
      shiftRequests: shiftRequests.map((req) => ({
        id: req.id,
        sapId: req.sapId,
        maskedSapId: "***" + req.sapId.slice(-3),
        employeeName: req.employeeName,
        requestedDate: req.requestedDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).replace(/ /g, "-"),
        currentShift: req.currentShift,
        requestedShift: req.requestedShift,
        status: req.status,
      })),
    });
  } catch (error) {
    console.error("dashboard error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
