"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import axios from "axios";

export const dynamic = "force-dynamic";
export const revalidate = 0;
import toast from "react-hot-toast";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      // TODO: Implement API endpoint for password reset
      // await axios.post("/api/auth/forgot-password", { email: data.email });
      
      // Simulate API call for now
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setIsSuccess(true);
      toast.success("Password reset link sent to your email!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send reset link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout title="Check Your Email" subtitle="We've sent you a password reset link">
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-neutral-900">
              Reset link sent!
            </h3>
            <p className="text-sm text-neutral-600">
              We've sent a password reset link to <strong>{getValues("email")}</strong>
            </p>
            <p className="text-sm text-neutral-600">
              Please check your email and click the link to reset your password.
            </p>
          </div>
          <div className="space-y-3">
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
            <button
              onClick={() => setIsSuccess(false)}
              className="w-full text-sm text-indigo-600 hover:text-indigo-700"
            >
              Didn't receive the email? Resend
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot Password" subtitle="Enter your email to reset your password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <p>
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

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
              } bg-white pl-10 pr-3 py-2.5 text-sm placeholder-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
              placeholder="you@example.com"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </span>
          ) : (
            "Send Reset Link"
          )}
        </button>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>
      </form>
    </AuthLayout>
  );
}
