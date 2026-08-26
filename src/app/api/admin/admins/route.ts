import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { CreateAdminSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        adminName: true,
        loginId: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { adminName: "asc" },
    });
    return NextResponse.json({ success: true, data: admins });
  } catch (error) {
    console.error("admins GET error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = CreateAdminSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const admin = await prisma.admin.create({
      data: {
        adminName: parsed.data.adminName,
        loginId: parsed.data.loginId,
        passwordHash,
        role: parsed.data.role,
        status: parsed.data.status,
      }
    });

    return NextResponse.json({ success: true, data: { id: admin.id, loginId: admin.loginId } }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: "Login ID already exists" }, { status: 409 });
    }
    console.error("admins POST error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}