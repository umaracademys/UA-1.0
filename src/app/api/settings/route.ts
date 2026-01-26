import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import SystemSettingsModel from "@/lib/db/models/SystemSettings";
import { verifyToken } from "@/lib/utils/jwt";
import { checkAPIPermission } from "@/lib/utils/permissions";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function GET(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!checkAPIPermission(decoded.role, "system.settings", decoded.permissions)) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const settings = await SystemSettingsModel.find({});
    const settingsMap: Record<string, any> = {};
    settings.forEach((setting) => {
      settingsMap[setting.key] = setting.value;
    });

    // Default settings if not set
    const defaultSettings = {
      colorScheme: {
        primary: "#2E4D32",
        secondary: "#C49636",
        accent: "#C49636",
      },
      logo: "/uploads/logo/logo-1769252899089.png", // Use uploaded logo as default
      systemName: "Umar Academy Portal",
      notificationEnabled: true,
      emailEnabled: false,
      emailHost: "",
      emailPort: 587,
      emailUser: "",
      emailPassword: "",
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecialChars: true,
      lockoutThreshold: 5,
      lockoutDuration: 30,
      sessionTimeout: 60,
      twoFactorEnabled: false,
      modulesEnabled: {
        assignments: true,
        tickets: true,
        evaluations: true,
        attendance: true,
        messages: true,
        mushaf: true,
      },
    };

    return NextResponse.json({
      success: true,
      settings: { ...defaultSettings, ...settingsMap },
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load settings." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!checkAPIPermission(decoded.role, "system.settings", decoded.permissions)) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    await connectToDatabase();

    const body = await request.json();
    console.log("Received settings payload:", JSON.stringify(body, null, 2)); // Debug log
    
    const {
      colorScheme,
      logo,
      systemName,
      notificationEnabled,
      emailEnabled,
      emailHost,
      emailPort,
      emailUser,
      emailPassword,
      passwordMinLength,
      passwordRequireUppercase,
      passwordRequireLowercase,
      passwordRequireNumbers,
      passwordRequireSpecialChars,
      lockoutThreshold,
      lockoutDuration,
      sessionTimeout,
      twoFactorEnabled,
      modulesEnabled,
    } = body;

    // Helper function to save a setting
    const saveSetting = async (key: string, value: any) => {
      // Allow saving null/empty values for settings that can be cleared
      if (value !== undefined) {
        await SystemSettingsModel.findOneAndUpdate(
          { key },
          { value, updatedBy: decoded.userId },
          { upsert: true, new: true },
        );
        console.log(`Saved setting: ${key} =`, value); // Debug log
      }
    };

    // Save appearance settings
    await saveSetting("colorScheme", colorScheme);

    // Handle logo upload
    if (logo !== undefined) {
      if (logo === null || logo === "") {
        // Remove logo
        await saveSetting("logo", null);
      } else if (typeof logo === "string" && logo.startsWith("data:image")) {
        // If logo is a base64 string, save it as a file
        const base64Data = logo.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const uploadDir = join(process.cwd(), "public", "uploads", "logo");
        await mkdir(uploadDir, { recursive: true });
        const filename = `logo-${Date.now()}.png`;
        const filepath = join(uploadDir, filename);
        await writeFile(filepath, buffer);
        const logoUrl = `/uploads/logo/${filename}`;
        await saveSetting("logo", logoUrl);
      } else if (typeof logo === "string") {
        // If it's already a URL, just save it
        await saveSetting("logo", logo);
      }
    }

    // Save general settings
    await saveSetting("systemName", systemName);
    await saveSetting("notificationEnabled", notificationEnabled);
    await saveSetting("emailEnabled", emailEnabled);
    await saveSetting("emailHost", emailHost);
    await saveSetting("emailPort", emailPort);
    await saveSetting("emailUser", emailUser);
    await saveSetting("emailPassword", emailPassword);

    // Save security settings
    await saveSetting("passwordMinLength", passwordMinLength);
    await saveSetting("passwordRequireUppercase", passwordRequireUppercase);
    await saveSetting("passwordRequireLowercase", passwordRequireLowercase);
    await saveSetting("passwordRequireNumbers", passwordRequireNumbers);
    await saveSetting("passwordRequireSpecialChars", passwordRequireSpecialChars);
    await saveSetting("lockoutThreshold", lockoutThreshold);
    await saveSetting("lockoutDuration", lockoutDuration);
    await saveSetting("sessionTimeout", sessionTimeout);
    await saveSetting("twoFactorEnabled", twoFactorEnabled);

    // Save module settings
    await saveSetting("modulesEnabled", modulesEnabled);

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully.",
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to update settings." },
      { status: 500 },
    );
  }
}
