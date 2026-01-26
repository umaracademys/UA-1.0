/**
 * Script to create the first super admin user
 * Run with: npm run create-super-admin
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "../.env.local") });

import { connectToDatabase } from "../src/lib/db/connection";
import UserModel from "../src/lib/db/models/User";

async function createSuperAdmin() {
  try {
    await connectToDatabase();
    console.log("Connected to database");

    // Check if super admin already exists
    const existingSuperAdmin = await UserModel.findOne({ role: "super_admin" });
    if (existingSuperAdmin) {
      console.log("Super admin already exists!");
      console.log(`Email: ${existingSuperAdmin.email}`);
      process.exit(0);
    }

    // Create super admin user
    const superAdmin = await UserModel.create({
      email: "admin@umaracademy.com",
      password: "Admin@123456", // Change this password after first login!
      fullName: "Super Administrator",
      role: "super_admin",
      contactNumber: "+1234567890",
      isActive: true,
    });

    console.log("\n✅ Super Admin created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Email: admin@umaracademy.com");
    console.log("Password: Admin@123456");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️  IMPORTANT: Change this password after first login!");
    console.log("\n");

    process.exit(0);
  } catch (error) {
    console.error("Error creating super admin:", error);
    process.exit(1);
  }
}

createSuperAdmin();
