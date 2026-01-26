/**
 * Script to fix users missing required fields
 * Run with: npm run fix-users
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

async function fixUsers() {
  try {
    await connectToDatabase();
    console.log("Connected to database");

    // Find users missing fullName
    const usersWithoutFullName = await UserModel.find({
      $or: [
        { fullName: { $exists: false } },
        { fullName: null },
        { fullName: "" },
      ],
    });

    if (usersWithoutFullName.length === 0) {
      console.log("✅ All users have fullName field set.");
      process.exit(0);
    }

    console.log(`Found ${usersWithoutFullName.length} user(s) missing fullName.`);

    // Fix each user
    for (const user of usersWithoutFullName) {
      const defaultName = user.email.split("@")[0] || "User";
      const capitalizedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
      
      await UserModel.updateOne(
        { _id: user._id },
        {
          $set: {
            fullName: capitalizedName,
          },
        },
      );

      console.log(`✅ Fixed user: ${user.email} -> fullName: ${capitalizedName}`);
    }

    console.log("\n✅ All users have been fixed!");
    process.exit(0);
  } catch (error) {
    console.error("Error fixing users:", error);
    process.exit(1);
  }
}

fixUsers();
