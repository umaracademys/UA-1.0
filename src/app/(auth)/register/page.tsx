"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, ChevronRight, ChevronLeft, User, Mail, Lock, Phone, Users } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import toast from "react-hot-toast";

const registerSchema = z
  .object({
    // Step 1: Basic Info
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    contactNumber: z.string().optional(),
    // Step 2: Role
    role: z.enum(["student", "teacher"], {
      message: "Please select a role",
    }),
    // Step 3: Role-specific
    parentName: z.string().optional(),
    parentContact: z.string().optional(),
    programType: z.enum(["Full-Time HQ", "Part-Time HQ", "After School"]).optional(),
    specialization: z.string().optional(),
    // Terms
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      if (data.role === "student") {
        return data.parentName && data.parentContact && data.programType;
      }
      return true;
    },
    {
      message: "Please fill in all required fields",
      path: ["parentName"],
    },
  )
  .refine(
    (data) => {
      if (data.role === "teacher") {
        return data.specialization;
      }
      return true;
    },
    {
      message: "Specialization is required for teachers",
      path: ["specialization"],
    },
  );

type RegisterFormData = z.infer<typeof registerSchema>;

const steps = [
  { id: 1, title: "Basic Information" },
  { id: 2, title: "Role Selection" },
  { id: 3, title: "Additional Details" },
];

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      acceptTerms: false,
    },
  });

  const password = watch("password");
  const role = watch("role");

  const validateStep = async (step: number): Promise<boolean> => {
    let fields: (keyof RegisterFormData)[] = [];
    
    switch (step) {
      case 1:
        fields = ["fullName", "email", "password", "confirmPassword"];
        break;
      case 2:
        fields = ["role"];
        break;
      case 3:
        if (role === "student") {
          fields = ["parentName", "parentContact", "programType"];
        } else if (role === "teacher") {
          fields = ["specialization"];
        }
        break;
    }

    const isValid = await trigger(fields as any);
    return isValid;
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        role: data.role,
        contactNumber: data.contactNumber,
        ...(data.role === "student"
          ? {
              parentName: data.parentName,
              parentContact: data.parentContact,
              programType: data.programType,
            }
          : {
              specialization: data.specialization,
            }),
      });
      toast.success("Registration successful!");
      // Redirect is handled in AuthContext
    } catch (err: any) {
      toast.error(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Create Account" subtitle="Sign up to get started">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    currentStep >= step.id
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-neutral-300 bg-white text-neutral-400"
                  }`}
                >
                  {step.id}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-12 ${
                      currentStep > step.id ? "bg-indigo-600" : "bg-neutral-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-sm text-neutral-600">
            {steps[currentStep - 1].title}
          </p>
        </div>

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-neutral-700">
                Full Name
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  {...register("fullName")}
                  type="text"
                  id="fullName"
                  className={`block w-full rounded-lg border ${
                    errors.fullName ? "border-red-300" : "border-neutral-300"
                  } bg-white pl-10 pr-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                  placeholder="John Doe"
                />
              </div>
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
              )}
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
                  } bg-white pl-10 pr-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

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
                  autoComplete="new-password"
                  className={`block w-full rounded-lg border ${
                    errors.password ? "border-red-300" : "border-neutral-300"
                  } bg-white pl-10 pr-10 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {password && <PasswordStrengthIndicator password={password} />}
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-neutral-700">
                Confirm Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  {...register("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  autoComplete="new-password"
                  className={`block w-full rounded-lg border ${
                    errors.confirmPassword ? "border-red-300" : "border-neutral-300"
                  } bg-white pl-10 pr-10 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="contactNumber" className="mb-2 block text-sm font-medium text-neutral-700">
                Contact Number (Optional)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Phone className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  {...register("contactNumber")}
                  type="tel"
                  id="contactNumber"
                  className="block w-full rounded-lg border border-neutral-300 bg-white pl-10 pr-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Role Selection */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Select Your Role
              </label>
              <div className="grid gap-4">
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                    role === "student"
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-neutral-300 hover:border-neutral-400"
                  }`}
                >
                  <input
                    {...register("role")}
                    type="radio"
                    value="student"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Users className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="font-medium text-neutral-900">Student</p>
                    <p className="text-sm text-neutral-500">I am a student at Umar Academy</p>
                  </div>
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                    role === "teacher"
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-neutral-300 hover:border-neutral-400"
                  }`}
                >
                  <input
                    {...register("role")}
                    type="radio"
                    value="teacher"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <User className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="font-medium text-neutral-900">Teacher</p>
                    <p className="text-sm text-neutral-500">I am a teacher at Umar Academy</p>
                  </div>
                </label>
              </div>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Role-specific Details */}
        {currentStep === 3 && (
          <div className="space-y-4">
            {role === "student" ? (
              <>
                <div>
                  <label htmlFor="parentName" className="mb-2 block text-sm font-medium text-neutral-700">
                    Parent/Guardian Name
                  </label>
                  <input
                    {...register("parentName")}
                    type="text"
                    id="parentName"
                    className={`block w-full rounded-lg border ${
                      errors.parentName ? "border-red-300" : "border-neutral-300"
                    } bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                  />
                  {errors.parentName && (
                    <p className="mt-1 text-sm text-red-600">{errors.parentName.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="parentContact" className="mb-2 block text-sm font-medium text-neutral-700">
                    Parent/Guardian Contact
                  </label>
                  <input
                    {...register("parentContact")}
                    type="tel"
                    id="parentContact"
                    className={`block w-full rounded-lg border ${
                      errors.parentContact ? "border-red-300" : "border-neutral-300"
                    } bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                  />
                  {errors.parentContact && (
                    <p className="mt-1 text-sm text-red-600">{errors.parentContact.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="programType" className="mb-2 block text-sm font-medium text-neutral-700">
                    Program Type
                  </label>
                  <select
                    {...register("programType")}
                    id="programType"
                    className={`block w-full rounded-lg border ${
                      errors.programType ? "border-red-300" : "border-neutral-300"
                    } bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                  >
                    <option value="">Select program type</option>
                    <option value="Full-Time HQ">Full-Time HQ</option>
                    <option value="Part-Time HQ">Part-Time HQ</option>
                    <option value="After School">After School</option>
                  </select>
                  {errors.programType && (
                    <p className="mt-1 text-sm text-red-600">{errors.programType.message}</p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="specialization" className="mb-2 block text-sm font-medium text-neutral-700">
                  Specialization
                </label>
                <input
                  {...register("specialization")}
                  type="text"
                  id="specialization"
                  className={`block w-full rounded-lg border ${
                    errors.specialization ? "border-red-300" : "border-neutral-300"
                  } bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                  placeholder="e.g., Tajweed, Qaidah, Arabic"
                />
                {errors.specialization && (
                  <p className="mt-1 text-sm text-red-600">{errors.specialization.message}</p>
                )}
              </div>
            )}

            {/* Terms and Conditions */}
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <label className="flex items-start gap-3">
                <input
                  {...register("acceptTerms")}
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-neutral-700">
                  I agree to the{" "}
                  <Link href="/terms" className="text-indigo-600 hover:text-indigo-700">
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-indigo-600 hover:text-indigo-700">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="mt-1 text-sm text-red-600">{errors.acceptTerms.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < steps.length ? (
            <button
              type="button"
              onClick={handleNext}
              className="ml-auto flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="ml-auto w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          )}
        </div>

        {/* Login Link */}
        <p className="text-center text-sm text-neutral-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
