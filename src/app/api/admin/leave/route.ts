import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreateLeaveSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sapId = searchParams.get("sapId");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const status = searchParams.get("status");

  const where: any = {};
  if (sapId) where.sapId = { contains: sapId, mode: 'insensitive' };
  if (fromDate && toDate) {
    where.leaveDate = {
      gte: new Date(fromDate),
      lte: new Date(toDate)
    };
  }
  if (status) where.status = status;

  try {
    const leaves = await prisma.leaveRecord.findMany({
      where,
      include: {
        employee: { select: { employeeName: true } }
      },
      orderBy: [{ leaveDate: 'desc' }]
    });
    return NextResponse.json({ success: true, data: leaves });
  } catch (error) {
    console.error("leave GET error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = CreateLeaveSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const leave = await prisma.leaveRecord.create({
      data: {
        ...parsed.data,
        leaveDate: new Date(parsed.data.leaveDate)
      }
    });

    return NextResponse.json({ success: true, data: leave }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: "Leave already exists for this date and employee." }, { status: 409 });
    }
    console.error("leave POST error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, status } = body;
    
    if (!id || !status) return NextResponse.json({ success: false, error: "ID and status required" }, { status: 400 });

    const leave = await prisma.leaveRecord.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    return NextResponse.json({ success: true, data: leave });
  } catch (error) {
    console.error("leave PUT error:", error);
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
    await prisma.leaveRecord.delete({
      where: { id: parseInt(id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("leave DELETE error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}