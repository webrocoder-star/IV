import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, newPassword } = body;

    if (!id || !newPassword) {
      return NextResponse.json({ success: false, error: "ID and new password are required" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.admin.update({
      where: { id: parseInt(id) },
      data: { passwordHash }
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("admins reset password error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
