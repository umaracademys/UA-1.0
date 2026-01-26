import { NextResponse } from "next/server";

import { verifyToken } from "@/lib/utils/jwt";
import { hasPermission } from "@/lib/utils/permissions";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

// Predefined evaluation category templates
const DEFAULT_TEMPLATES = [
  {
    id: "default",
    name: "Default Evaluation Template",
    categories: [
      {
        name: "Attendance",
        description: "Student's attendance and punctuality",
        maxRating: 5,
      },
      {
        name: "Participation",
        description: "Active participation in class activities",
        maxRating: 5,
      },
      {
        name: "Behavior",
        description: "Classroom behavior and respect",
        maxRating: 5,
      },
      {
        name: "Recitation Quality",
        description: "Quality of Quranic recitation",
        maxRating: 5,
      },
      {
        name: "Homework Completion",
        description: "Completion and quality of homework",
        maxRating: 5,
      },
      {
        name: "Memorization Progress",
        description: "Progress in memorization",
        maxRating: 5,
      },
      {
        name: "Tajweed Application",
        description: "Application of tajweed rules",
        maxRating: 5,
      },
      {
        name: "Overall Progress",
        description: "Overall academic and spiritual progress",
        maxRating: 5,
      },
    ],
  },
  {
    id: "comprehensive",
    name: "Comprehensive Evaluation Template",
    categories: [
      {
        name: "Attendance",
        description: "Student's attendance and punctuality",
        maxRating: 5,
      },
      {
        name: "Participation",
        description: "Active participation in class activities",
        maxRating: 5,
      },
      {
        name: "Behavior",
        description: "Classroom behavior and respect",
        maxRating: 5,
      },
      {
        name: "Recitation Quality",
        description: "Quality of Quranic recitation",
        maxRating: 5,
      },
      {
        name: "Homework Completion",
        description: "Completion and quality of homework",
        maxRating: 5,
      },
      {
        name: "Memorization Progress",
        description: "Progress in memorization",
        maxRating: 5,
      },
      {
        name: "Tajweed Application",
        description: "Application of tajweed rules",
        maxRating: 5,
      },
      {
        name: "Mistake Correction",
        description: "Ability to correct mistakes",
        maxRating: 5,
      },
      {
        name: "Focus and Concentration",
        description: "Level of focus during lessons",
        maxRating: 5,
      },
      {
        name: "Overall Progress",
        description: "Overall academic and spiritual progress",
        maxRating: 5,
      },
    ],
  },
  {
    id: "basic",
    name: "Basic Evaluation Template",
    categories: [
      {
        name: "Attendance",
        description: "Student's attendance and punctuality",
        maxRating: 5,
      },
      {
        name: "Recitation Quality",
        description: "Quality of Quranic recitation",
        maxRating: 5,
      },
      {
        name: "Homework Completion",
        description: "Completion and quality of homework",
        maxRating: 5,
      },
      {
        name: "Overall Progress",
        description: "Overall academic and spiritual progress",
        maxRating: 5,
      },
    ],
  },
];

// In-memory storage for custom templates (in production, use database)
const customTemplates: Array<{
  id: string;
  name: string;
  categories: Array<{
    name: string;
    description: string;
    maxRating: number;
  }>;
  createdBy: string;
  createdAt: Date;
}> = [];

export async function GET(request: Request) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    // No permission check needed - all authenticated users can view templates

    // Combine default and custom templates
    const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];

    return NextResponse.json({
      success: true,
      templates: allTemplates,
    });
  } catch (error) {
    console.error("Error fetching evaluation templates:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to load templates." },
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
    if (decoded.role !== "admin" && decoded.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const body = (await request.json()) as {
      name: string;
      categories: Array<{
        name: string;
        description: string;
        maxRating: number;
      }>;
    };

    const { name, categories } = body;

    if (!name || !categories || categories.length === 0) {
      return NextResponse.json(
        { success: false, message: "Template name and categories are required." },
        { status: 400 },
      );
    }

    // Validate categories
    const invalidCategory = categories.find((cat) => !cat.name || cat.maxRating < 1 || cat.maxRating > 5);
    if (invalidCategory) {
      return NextResponse.json(
        { success: false, message: "Invalid category data. Name is required and maxRating must be 1-5." },
        { status: 400 },
      );
    }

    // Create custom template
    const template = {
      id: `custom-${Date.now()}`,
      name,
      categories,
      createdBy: decoded.userId,
      createdAt: new Date(),
    };

    customTemplates.push(template);

    // In production, save to database
    // await EvaluationTemplateModel.create(template);

    return NextResponse.json({
      success: true,
      message: "Template created successfully.",
      template,
    });
  } catch (error) {
    console.error("Error creating evaluation template:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Failed to create template." },
      { status: 500 },
    );
  }
}
