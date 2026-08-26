import { NextRequest, NextResponse } from "next/server";
import { validateEmployee } from "@/lib/business-rules";
import { ValidateSapIdSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ValidateSapIdSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await validateEmployee(parsed.data.sapId);

    if (!result.success) {
      const statusCode = result.code === "SERVER_ERROR" ? 500 : 400;
      return NextResponse.json(
        { success: false, error: result.error, code: result.code },
        { status: statusCode }
      );
    }

    // NEVER return full SAP ID — only masked version
    return NextResponse.json({
      success: true,
      maskedSapId: result.maskedSapId,
      employeeName: result.employeeName,
      defaultShift: result.defaultShift,
      tlName: result.tlName,
    });
  } catch (error) {
    console.error("validate route error:", error);
    return NextResponse.json(
      { success: false, error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}
