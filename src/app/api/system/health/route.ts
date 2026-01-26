import { NextResponse } from "next/server";
import { getSystemMetrics } from "@/lib/utils/systemHealth";
import { verifyToken } from "@/lib/utils/jwt";
import { hasPermission } from "@/lib/utils/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Authenticate request
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (error) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }

    // Check if user has permission (super admin only)
    if (!hasPermission(decoded.role, "system.settings") && decoded.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    // Get system metrics
    const metrics = await getSystemMetrics();

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error("Failed to get system health:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve system health" },
      { status: 500 },
    );
  }
}
