import fs from "fs/promises";
import path from "path";

type PDFMetadata = {
  pages: number;
  size: number;
  title?: string;
};

/**
 * Validate PDF file
 */
export function validatePDFFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (file.type !== "application/pdf") {
    return { valid: false, error: "File must be a PDF" };
  }

  // Check file size (max 50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return { valid: false, error: "File size must be less than 50MB" };
  }

  // Check if file has content
  if (file.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  return { valid: true };
}

/**
 * Extract PDF metadata
 * Note: This is a simplified version. In production, you'd use a library like pdf-lib or pdfjs-dist
 */
export async function extractPDFMetadata(file: File): Promise<PDFMetadata> {
  // For now, return basic metadata
  // In production, use pdf-lib or pdfjs-dist to extract actual page count and title
  return {
    pages: 1, // Would extract from PDF
    size: file.size,
    title: file.name.replace(".pdf", ""),
  };
}

/**
 * Generate thumbnail for PDF (first page)
 * Note: This would require a PDF rendering library like pdfjs-dist or pdf-poppler
 */
export async function generateThumbnail(pdfPath: string): Promise<string> {
  // This is a placeholder implementation
  // In production, you would:
  // 1. Use pdfjs-dist to render the first page
  // 2. Convert to image (canvas or sharp)
  // 3. Save thumbnail to /public/uploads/pdfs/thumbnails/
  // 4. Return thumbnail path

  const thumbnailDir = path.join(process.cwd(), "public", "uploads", "pdfs", "thumbnails");
  await fs.mkdir(thumbnailDir, { recursive: true });

  const pdfFilename = path.basename(pdfPath, ".pdf");
  const thumbnailPath = path.join(thumbnailDir, `${pdfFilename}_thumb.png`);

  // Placeholder: In production, generate actual thumbnail
  // For now, return the path that would be created
  return `/uploads/pdfs/thumbnails/${pdfFilename}_thumb.png`;
}

/**
 * Compress PDF
 * Note: This would require a PDF compression library
 */
export async function compressPDF(pdfPath: string): Promise<string> {
  // This is a placeholder implementation
  // In production, you would use a library like pdf-lib or ghostscript to compress
  // For now, return the original path
  return pdfPath;
}

/**
 * Save uploaded PDF file
 */
export async function savePDFFile(
  file: File,
  filename: string,
): Promise<{ filePath: string; fileSize: number }> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "pdfs");
  await fs.mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, filename);
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  await fs.writeFile(filePath, buffer);

  return {
    filePath: `/uploads/pdfs/${filename}`,
    fileSize: buffer.length,
  };
}

/**
 * Delete PDF file
 */
export async function deletePDFFile(filePath: string): Promise<void> {
  try {
    const fullPath = path.join(process.cwd(), "public", filePath);
    await fs.unlink(fullPath);

    // Also try to delete thumbnail if exists
    const thumbnailPath = fullPath.replace(".pdf", "_thumb.png");
    try {
      await fs.unlink(thumbnailPath);
    } catch {
      // Thumbnail might not exist, ignore
    }
  } catch (error) {
    console.error("Failed to delete PDF file:", error);
    throw error;
  }
}
