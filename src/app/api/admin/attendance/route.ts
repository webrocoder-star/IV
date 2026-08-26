import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const sapId = searchParams.get("sapId");
  const attendanceType = searchParams.get("attendanceType");
  const shift = searchParams.get("shift");
  const tlName = searchParams.get("tlName");
  
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const skip = (page - 1) * limit;

  const where: any = {};
  if (fromDate && toDate) {
    where.attendanceDate = {
      gte: new Date(fromDate),
      lte: new Date(toDate)
    };
  }
  if (sapId) where.sapId = { contains: sapId, mode: 'insensitive' };
  if (attendanceType) where.attendanceType = attendanceType;
  if (shift) where.shift = shift;
  if (tlName) {
    where.employee = { tlName: { contains: tlName, mode: 'insensitive' } };
  }

  try {
    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          employee: { select: { employeeName: true, tlName: true } }
        },
        orderBy: [{ attendanceDate: 'desc' }, { sapId: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.attendance.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: records, total, page, limit });
  } catch (error) {
    console.error("attendance GET error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, shift, attendanceType } = body;

    if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

    const updated = await prisma.attendance.update({
      where: { id: parseInt(id) },
      data: {
        ...(shift !== undefined && { shift }),
        ...(attendanceType !== undefined && { attendanceType }),
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("attendance PUT error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
