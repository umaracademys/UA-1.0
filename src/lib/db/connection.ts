import mongoose, { Connection } from "mongoose";
import { validateEnvironmentVariables } from "@/lib/utils/env-check";

type MongooseCache = {
  conn: Connection | null;
  promise: Promise<Connection> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cache;

const defaultOptions: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45_000,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const connectWithRetry = async (
  uri: string,
  options: mongoose.ConnectOptions,
  retries = 3,
): Promise<Connection> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const connection = await mongoose.connect(uri, options);
      return connection.connection;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(500 * attempt);
      }
    }
  }

  throw lastError;
};

export const connectToDatabase = async (): Promise<Connection> => {
  // Validate environment variables first
  const envCheck = validateEnvironmentVariables();
  if (!envCheck.valid) {
    const error = new Error(
      `Missing required environment variables: ${envCheck.missing.join(", ")}. Please configure these in Render.`
    );
    console.error("❌ Environment validation failed:", error.message);
    throw error;
  }

  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      const error = new Error("Missing MONGODB_URI environment variable.");
      console.error("❌ Database connection error:", error.message);
      throw error;
    }

    try {
      cache.promise = connectWithRetry(uri, defaultOptions, 4);
    } catch (error) {
      console.error("Failed to create database connection promise:", error);
      throw error;
    }
  }

  try {
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (error) {
    // Clear the promise on error so we can retry
    cache.promise = null;
    console.error("Database connection failed:", error);
    throw error;
  }
};
