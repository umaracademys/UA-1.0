import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/connection";
import UserModel from "@/lib/db/models/User";
import { generateToken } from "@/lib/utils/jwt";

type LoginPayload = {
  email: string;
  password: string;
};

type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

const rateLimitWindowMs = 15 * 60 * 1000;
const rateLimitMax = 5;
const rateLimitStore = new Map<string, RateLimitEntry>();

const getClientKey = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
};

const applyRateLimit = (key: string) => {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.expiresAt <= now) {
    const fresh = { count: 1, expiresAt: now + rateLimitWindowMs };
    rateLimitStore.set(key, fresh);
    return { allowed: true };
  }

  if (entry.count >= rateLimitMax) {
    return { allowed: false, retryAfter: Math.ceil((entry.expiresAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true };
};

export async function POST(request: Request) {
  try {
    const rateLimitKey = getClientKey(request);
    const rateLimit = applyRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfter ?? 900) },
        },
      );
    }

    const body = (await request.json()) as Partial<LoginPayload>;
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const user = await UserModel.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 },
      );
    }

    if (user.isAccountLocked()) {
      const remainingMs = Math.max(
        0,
        user.accountLockedUntil ? user.accountLockedUntil.getTime() - Date.now() : 0,
      );
      return NextResponse.json(
        {
          success: false,
          message: "Account is locked due to multiple failed attempts.",
          retryAfterSeconds: Math.ceil(remainingMs / 1000),
        },
        { status: 423 },
      );
    }

    const isMatch = await user.comparePassword(password);
    const lockoutThreshold = Number(process.env.LOCKOUT_THRESHOLD ?? "5");
    const remainingAttempts = Math.max(0, lockoutThreshold - (user.failedLoginAttempts + 1));

    if (!isMatch) {
      await user.incrementFailedAttempts();
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password.",
          remainingAttempts,
        },
        { status: 401 },
      );
    }

    // Reset failed attempts and update last login using updateOne to avoid validation issues
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: new Date(),
          failedLoginAttempts: 0,
          accountLockedUntil: null,
        },
      },
    );

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Login failed." },
      { status: 500 },
    );
  }
}
