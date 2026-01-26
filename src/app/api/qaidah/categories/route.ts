import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connection";
import QaidahLessonModel from "@/lib/db/models/QaidahLesson";
import { verifyToken } from "@/lib/utils/jwt";

const getAuthToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

const CATEGORIES = [
  {
    name: "Letters",
    description: "Learning Arabic letters and their sounds",
  },
  {
    name: "Harakat",
    description: "Short vowels (Fatha, Kasra, Damma)",
  },
  {
    name: "Tanween",
    description: "Nunation marks",
  },
  {
    name: "Sukoon",
    description: "Consonant absence of vowel",
  },
  {
    name: "Shaddah",
    description: "Letter doubling",
  },
  {
    name: "Madd",
    description: "Elongation of sounds",
  },
  {
    name: "Advanced",
    description: "Advanced reading rules and combinations",
  },
];

export async function GET(req: NextRequest) {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await verifyToken(token);
    await connectToDatabase();

    // Get lesson counts for each category
    const categoryCounts = await QaidahLessonModel.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$category",
          lessonCount: { $sum: 1 },
        },
      },
    ]);

    const categoriesWithCounts = CATEGORIES.map((category) => {
      const countData = categoryCounts.find((c) => c._id === category.name);
      return {
        ...category,
        lessonCount: countData?.lessonCount || 0,
      };
    });

    return NextResponse.json({
      success: true,
      categories: categoriesWithCounts,
    });
  } catch (error) {
    console.error("Error fetching Qaidah categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories", message: (error as Error).message },
      { status: 500 },
    );
  }
}
