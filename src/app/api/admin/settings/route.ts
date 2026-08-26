import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { SmtpSettingsSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const settings = await prisma.appSetting.findMany({
      where: {
        key: { in: ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from", "financial_year_start_month"] }
      }
    });

    const map: Record<string, string> = {};
    settings.forEach(s => {
      // Mask password for security
      if (s.key === "smtp_pass" && s.value) {
        map[s.key] = "***";
      } else {
        map[s.key] = s.value ?? "";
      }
    });

    return NextResponse.json({ success: true, data: map });
  } catch (error) {
    console.error("settings GET error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    
    // Allow updating just the financial year setting, or the full SMTP settings
    if (body.financial_year_start_month) {
        await prisma.appSetting.upsert({
            where: { key: "financial_year_start_month" },
            update: { value: body.financial_year_start_month },
            create: { key: "financial_year_start_month", value: body.financial_year_start_month }
        });
        return NextResponse.json({ success: true });
    }

    const parsed = SmtpSettingsSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const updates = [
      { key: "smtp_host", value: parsed.data.smtp_host },
      { key: "smtp_port", value: parsed.data.smtp_port },
      { key: "smtp_user", value: parsed.data.smtp_user },
      { key: "smtp_from", value: parsed.data.smtp_from },
    ];

    // Only update password if it's not the masked string
    if (parsed.data.smtp_pass && parsed.data.smtp_pass !== "***") {
      updates.push({ key: "smtp_pass", value: parsed.data.smtp_pass });
    }

    for (const update of updates) {
      await prisma.appSetting.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: { key: update.key, value: update.value }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("settings POST error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}