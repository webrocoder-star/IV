import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreateHolidaySchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");

  const where: any = {};
  if (year) {
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31T23:59:59`);
    where.holidayDate = {
      gte: startOfYear,
      lte: endOfYear
    };
  }

  try {
    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { holidayDate: 'asc' }
    });
    return NextResponse.json({ success: true, data: holidays });
  } catch (error) {
    console.error("holidays GET error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = CreateHolidaySchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const holiday = await prisma.holiday.create({
      data: {
        holidayDate: new Date(parsed.data.holidayDate),
        holidayName: parsed.data.holidayName
      }
    });

    return NextResponse.json({ success: true, data: holiday }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: "Holiday already exists for this date." }, { status: 409 });
    }
    console.error("holidays POST error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

  try {
    await prisma.holiday.delete({
      where: { id: parseInt(id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("holidays DELETE error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}