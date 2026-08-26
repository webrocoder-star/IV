import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ExportAttendanceSchema } from "@/lib/validations";
import { generateAttendanceExcel, generateAttendanceCsv } from "@/lib/excel";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const format = searchParams.get("format") ?? "excel";

  const parsed = ExportAttendanceSchema.safeParse({ fromDate, toDate, format });
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const from = new Date(parsed.data.fromDate);
  const to = new Date(parsed.data.toDate);

  try {
    if (parsed.data.format === "excel") {
      const buffer = await generateAttendanceExcel(from, to);
      return new NextResponse(buffer as any, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="attendance_export_${parsed.data.fromDate}.xlsx"`
        }
      });
    } else {
      const csv = await generateAttendanceCsv(from, to);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="attendance_export_${parsed.data.fromDate}.csv"`
        }
      });
    }
  } catch (error) {
    console.error("export GET error:", error);
    return NextResponse.json({ success: false, error: "Server error during export" }, { status: 500 });
  }
}
