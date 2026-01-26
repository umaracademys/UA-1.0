import { NextResponse } from "next/server";

// Proxy API route to fetch Mushaf page images from open-source CDNs
// This avoids CORS issues and provides a reliable fallback

// Helper to get image URL from Al-Quran Cloud API
async function getAlQuranCloudImageUrl(page: number): Promise<string | null> {
  try {
    const response = await fetch(`https://api.alquran.cloud/v1/page/${page}/quran-uthmani`);
    const data = await response.json();
    return data.data?.image || null;
  } catch {
    return null;
  }
}

const MUSHAF_CDN_SOURCES: Array<{
  name: string;
  getUrl: (page: number) => string | Promise<string | null>;
}> = [
  // Source 1: Quran.com CDN (most reliable)
  {
    name: "quran.com-cdn",
    getUrl: (page: number) => `https://cdn.quran.com/mushaf/pages/page-${page.toString().padStart(3, "0")}.png`,
  },
  // Source 2: Alternative CDN
  {
    name: "quran.com-api",
    getUrl: (page: number) => `https://quran.com/api/v4/pages/${page}/image`,
  },
  // Source 3: Al-Quran Cloud (returns JSON with image URL)
  {
    name: "alquran-cloud",
    getUrl: getAlQuranCloudImageUrl,
  },
];

export async function GET(
  request: Request,
  context: { params: { pageNumber: string } }
) {
  try {
    const pageNumber = parseInt(context.params.pageNumber, 10);
    
    if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > 604) {
      return NextResponse.json(
        { error: "Invalid page number. Must be between 1 and 604." },
        { status: 400 }
      );
    }

    // Try each CDN source
    for (const source of MUSHAF_CDN_SOURCES) {
      try {
        const urlResult = await source.getUrl(pageNumber);
        const imageUrl = typeof urlResult === "string" ? urlResult : urlResult;
        
        if (!imageUrl) continue;
        
        // Fetch the image
        const imageResponse = await fetch(imageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
        
        if (imageResponse.ok) {
          const imageBuffer = await imageResponse.arrayBuffer();
          const contentType = imageResponse.headers.get("content-type") || "image/png";
          
          return new NextResponse(imageBuffer, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        }
      } catch (error) {
        // Try next source
        continue;
      }
    }
    
    // All sources failed
    return NextResponse.json(
      { error: "Failed to fetch Mushaf page image from all sources." },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error fetching Mushaf page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
