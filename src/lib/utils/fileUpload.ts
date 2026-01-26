import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "10485760", 10); // 10MB default
const ALLOWED_FILE_TYPES = (process.env.ALLOWED_FILE_TYPES || "application/pdf,image/jpeg,image/png,audio/mpeg").split(",");
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";

export interface UploadedFile {
  filename: string;
  url: string;
  uploadedAt: Date;
}

export async function saveFile(file: File, subdirectory: string = ""): Promise<UploadedFile> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`);
  }

  // Create directory if it doesn't exist
  const uploadPath = join(process.cwd(), UPLOAD_DIR, subdirectory);
  if (!existsSync(uploadPath)) {
    await mkdir(uploadPath, { recursive: true });
  }

  // Generate unique filename
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = file.name.split(".").pop();
  const filename = `${timestamp}-${randomString}.${extension}`;
  const filepath = join(uploadPath, filename);

  // Convert file to buffer and save
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filepath, buffer);

  // Return file info
  const url = `/uploads/${subdirectory ? `${subdirectory}/` : ""}${filename}`;
  return {
    filename: file.name,
    url,
    uploadedAt: new Date(),
  };
}

export async function saveFiles(files: File[], subdirectory: string = ""): Promise<UploadedFile[]> {
  return Promise.all(files.map((file) => saveFile(file, subdirectory)));
}
