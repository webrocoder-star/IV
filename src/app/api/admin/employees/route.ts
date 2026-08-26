import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreateEmployeeSchema, UpdateEmployeeSchema } from "@/lib/validations";

// GET — list all employees
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { sapId: { contains: search, mode: "insensitive" } },
      { employeeName: { contains: search, mode: "insensitive" } },
      { tlName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: { employeeName: "asc" },
      skip,
      take: limit,
      select: {
        id: true,
        sapId: true,
        employeeName: true,
        defaultShift: true,
        tlName: true,
        tlEmail: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.employee.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: employees, total, page, limit });
}

// POST — create employee
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = CreateEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const employee = await prisma.employee.create({
      data: {
        sapId: parsed.data.sapId,
        employeeName: parsed.data.employeeName,
        defaultShift: parsed.data.defaultShift ?? null,
        tlName: parsed.data.tlName ?? null,
        tlEmail: parsed.data.tlEmail || null,
        status: parsed.data.status,
      },
    });
    return NextResponse.json({ success: true, data: employee }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { success: false, error: "SAP ID already exists." },
        { status: 409 }
      );
    }
    console.error("employee POST error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

// PUT — update employee
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = UpdateEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { id, ...data } = parsed.data;

  try {
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(data.sapId !== undefined && { sapId: data.sapId }),
        ...(data.employeeName !== undefined && { employeeName: data.employeeName }),
        ...(data.defaultShift !== undefined && { defaultShift: data.defaultShift }),
        ...(data.tlName !== undefined && { tlName: data.tlName }),
        ...(data.tlEmail !== undefined && { tlEmail: data.tlEmail || null }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    console.error("employee PUT error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

// DELETE — delete employee
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id") ?? "");

  if (!id) {
    return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
  }

  try {
    await prisma.employee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("employee DELETE error:", error);
    return NextResponse.json({ success: false, error: "Cannot delete — employee has attendance records" }, { status: 409 });
  }
}
