/**
 * Validate critical environment variables
 * This helps identify configuration issues early
 */
export function validateEnvironmentVariables(): { valid: boolean; missing: string[] } {
  const required = ["MONGODB_URI", "JWT_SECRET"];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Log environment variable status (for debugging)
 */
export function logEnvironmentStatus() {
  if (process.env.NODE_ENV === "production") {
    // In production, only log if critical vars are missing
    const validation = validateEnvironmentVariables();
    if (!validation.valid) {
      console.error("❌ Missing critical environment variables:", validation.missing);
      console.error("Please set these in your Render environment settings");
    } else {
      console.log("✅ All critical environment variables are set");
    }
  } else {
    // In development, log all env vars (except secrets)
    console.log("Environment Variables Status:");
    console.log("MONGODB_URI:", process.env.MONGODB_URI ? "✅ Set" : "❌ Missing");
    console.log("JWT_SECRET:", process.env.JWT_SECRET ? "✅ Set" : "❌ Missing");
    console.log("NODE_ENV:", process.env.NODE_ENV || "development");
  }
}
