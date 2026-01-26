"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import toast from "react-hot-toast";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const { login } = useAuth();
  const { settings } = useSystemSettings();
  const router = useRouter();
  const primaryColor = settings?.colorScheme?.primary || "#2E4D32";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    setLockoutTime(null);

    try {
      await login(data.email, data.password);
      toast.success("Welcome back!");
      // Redirect is handled in AuthContext
    } catch (err: any) {
      const errorMessage = err.message || "Login failed. Please try again.";
      setError(errorMessage);

      // Check if account is locked
      if (errorMessage.includes("locked") || errorMessage.includes("lockout")) {
        const match = errorMessage.match(/(\d+)\s*(minute|second)/i);
        if (match) {
          const time = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          setLockoutTime(unit === "minute" ? time * 60 : time);
        }
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to your account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-medium">Error</p>
            <p>{error}</p>
            {lockoutTime && (
              <p className="mt-2 text-xs">
                Account will be unlocked in {Math.ceil(lockoutTime / 60)} minutes.
              </p>
            )}
          </div>
        )}

        {/* Email Input */}
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-neutral-700">
            Email Address
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="h-5 w-5 text-neutral-400" />
            </div>
            <input
              {...register("email")}
              type="email"
              id="email"
              autoComplete="email"
              className={`block w-full rounded-lg border ${
                errors.email ? "border-red-300" : "border-neutral-300"
              } bg-white pl-10 pr-3 py-2.5 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2`}
              style={
                !errors.email
                  ? ({
                      "--tw-ring-color": `${primaryColor}33`,
                    } as React.CSSProperties)
                  : undefined
              }
              onFocus={(e) => {
                if (!errors.email) {
                  e.currentTarget.style.borderColor = primaryColor;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${primaryColor}33`;
                }
              }}
              onBlur={(e) => {
                if (!errors.email) {
                  e.currentTarget.style.borderColor = "";
                  e.currentTarget.style.boxShadow = "";
                }
              }}
              placeholder="you@example.com"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Password Input */}
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-neutral-700">
            Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-5 w-5 text-neutral-400" />
            </div>
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              className={`block w-full rounded-lg border ${
                errors.password ? "border-red-300" : "border-neutral-300"
              } bg-white pl-10 pr-10 py-2.5 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2`}
              style={
                !errors.password
                  ? ({
                      "--tw-ring-color": `${primaryColor}33`,
                    } as React.CSSProperties)
                  : undefined
              }
              onFocus={(e) => {
                if (!errors.password) {
                  e.currentTarget.style.borderColor = primaryColor;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${primaryColor}33`;
                }
              }}
              onBlur={(e) => {
                if (!errors.password) {
                  e.currentTarget.style.borderColor = "";
                  e.currentTarget.style.boxShadow = "";
                }
              }}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              {...register("rememberMe")}
              id="rememberMe"
              type="checkbox"
              className="h-4 w-4 rounded border-neutral-300 focus:ring-2"
              style={{
                accentColor: primaryColor,
                "--tw-ring-color": primaryColor,
              } as React.CSSProperties}
            />
            <label htmlFor="rememberMe" className="ml-2 text-sm text-neutral-700">
              Remember me
            </label>
          </div>
          <Link
            href="/forgot-password"
            className="text-sm font-medium hover:opacity-80"
            style={{ color: primaryColor }}
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
          style={{
            backgroundColor: primaryColor,
            "--tw-ring-color": primaryColor,
          } as React.CSSProperties}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </span>
          ) : (
            "Sign In"
          )}
        </button>

        {/* Register Link */}
        <p className="text-center text-sm text-neutral-600">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="font-medium hover:opacity-80"
            style={{ color: primaryColor }}
          >
            Register here
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
