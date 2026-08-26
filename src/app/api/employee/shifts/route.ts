import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const shifts = await prisma.shift.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        shiftLabel: true,
        startTime: true,
        endTime: true,
        colorHex: true,
      },
    });

    return NextResponse.json({ success: true, data: shifts });
  } catch (error) {
    console.error("shifts GET error:", error);
    return NextResponse.json(
      { success: false, error: "Server error." },
      { status: 500 }
    );
  }
}
