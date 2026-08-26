import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { records } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ success: false, error: "No records provided" }, { status: 400 });
    }

    let processedCount = 0;

    for (const record of records) {
      if (!record.sapId || !record.shiftLabel) continue;

      // Update employee default shift and tlName if provided
      await prisma.employee.upsert({
        where: { sapId: String(record.sapId) },
        update: {
          ...(record.shiftLabel && { defaultShift: record.shiftLabel }),
          ...(record.tlName && { tlName: record.tlName }),
        },
        create: {
          sapId: String(record.sapId),
          employeeName: record.employeeName || String(record.sapId),
          defaultShift: record.shiftLabel,
          tlName: record.tlName || null,
        }
      });

      // Upsert into shift_schedules
      await prisma.shiftSchedule.create({
        data: {
          sapId: String(record.sapId),
          shiftLabel: record.shiftLabel,
          weekNumber: record.weekNumber ? parseInt(record.weekNumber) : null,
          month: record.month ? parseInt(record.month) : null,
          year: record.year ? parseInt(record.year) : null,
          effectiveFrom: record.effectiveFrom ? new Date(record.effectiveFrom) : null,
          effectiveTo: record.effectiveTo ? new Date(record.effectiveTo) : null,
        }
      });

      processedCount++;
    }

    return NextResponse.json({ success: true, processedCount });
  } catch (error) {
    console.error("import-schedule POST error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
