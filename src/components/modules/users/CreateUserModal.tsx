"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Listbox, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

import type { ProgramType, UserRole } from "@/types";

const roleOptions: { label: string; value: UserRole }[] = [
  { label: "Super Admin", value: "super_admin" },
  { label: "Admin", value: "admin" },
  { label: "Teacher", value: "teacher" },
  { label: "Student", value: "student" },
];

const programOptions: ProgramType[] = ["Full-Time HQ", "Part-Time HQ", "After School"];

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  role: z.enum(["super_admin", "admin", "teacher", "student"]),
  contactNumber: z.string().optional(),
  parentName: z.string().optional(),
  parentContact: z.string().optional(),
  programType: z.union([
    z.enum(["Full-Time HQ", "Part-Time HQ", "After School"]),
    z.literal(""),
    z.undefined(),
  ]).optional(),
  scheduleDays: z.string().optional(),
  scheduleTimes: z.string().optional(),
  specialization: z.string().optional(),
  joinDate: z.string().optional(),
}).superRefine((data, ctx) => {
  // Only validate programType if role is student
  if (data.role === "student") {
    if (!data.programType || !["Full-Time HQ", "Part-Time HQ", "After School"].includes(data.programType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Program type is required for students",
        path: ["programType"],
      });
    }
  }
});

export type CreateUserValues = z.infer<typeof schema>;

type CreateUserModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreateUserValues) => Promise<void>;
};

const getPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
};

export function CreateUserModal({ open, onClose, onCreate }: CreateUserModalProps) {
  const [submitting, setSubmitting] = useState(false);
  
  // Debug: Log when modal open state changes
  useEffect(() => {
    console.log("CreateUserModal open state:", open);
  }, [open]);
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    getValues,
  } = useForm<CreateUserValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "student",
    },
  });
  
  // Debug: Log form errors and values
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("=== FORM VALIDATION ERRORS ===");
      console.log("Errors:", errors);
    }
  }, [errors]);
  
  // Debug: Log current form values
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      console.log("Form field changed:", name, "=", value[name as keyof typeof value]);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const role = watch("role");
  const password = watch("password") ?? "";
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const onSubmit = async (values: CreateUserValues) => {
    console.log("=== FORM SUBMITTED ===");
    console.log("Form values:", values);
    try {
      setSubmitting(true);
      console.log("Calling onCreate with values:", values);
      await onCreate(values);
      console.log("onCreate completed successfully");
      toast.success("User created successfully.");
      onClose();
    } catch (error) {
      console.error("Error in onSubmit:", error);
      toast.error((error as Error).message || "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
                <Dialog.Title className="text-lg font-semibold text-neutral-900">
                  Create User
                </Dialog.Title>
                <form 
                  className="mt-4 space-y-4" 
                  onSubmit={handleSubmit(
                    (data) => {
                      console.log("=== FORM VALIDATION PASSED ===");
                      console.log("Validated data:", data);
                      // Clean up data - remove undefined/empty optional fields for non-student roles
                      const cleanedData = { ...data };
                      if (cleanedData.role !== "student") {
                        delete cleanedData.programType;
                        delete cleanedData.parentName;
                        delete cleanedData.parentContact;
                        delete cleanedData.scheduleDays;
                        delete cleanedData.scheduleTimes;
                      }
                      if (cleanedData.role !== "teacher") {
                        delete cleanedData.specialization;
                        delete cleanedData.joinDate;
                      }
                      console.log("Cleaned data:", cleanedData);
                      onSubmit(cleanedData as CreateUserValues);
                    },
                    (validationErrors) => {
                      console.log("=== FORM VALIDATION FAILED ===");
                      console.log("Validation errors:", validationErrors);
                      console.log("Current form values:", getValues());
                      const errorMessages = Object.entries(validationErrors).map(([field, error]) => {
                        return `${field}: ${error?.message || "Invalid"}`;
                      });
                      toast.error(`Please fix the form errors: ${errorMessages.join(", ")}`);
                    }
                  )}
                  noValidate
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-neutral-700">Email</label>
                      <input
                        type="email"
                        className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                        {...register("email")}
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700">Full Name</label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                        {...register("fullName")}
                      />
                      {errors.fullName && (
                        <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700">Password</label>
                      <input
                        type="password"
                        className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                        {...register("password")}
                      />
                      {errors.password && (
                        <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                      )}
                      <div className="mt-2 h-2 w-full rounded-full bg-neutral-100">
                        <div
                          className={`h-2 rounded-full ${
                            strength <= 2
                              ? "bg-red-400"
                              : strength <= 4
                                ? "bg-yellow-400"
                                : "bg-green-500"
                          }`}
                          style={{ width: `${(strength / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700">Role</label>
                      <input type="hidden" {...register("role")} />
                      <Listbox
                        value={role}
                        onChange={(value) => {
                          console.log("Role changed to:", value);
                          setValue("role", value, { shouldValidate: true });
                        }}
                      >
                        <div className="relative mt-1">
                          <Listbox.Button className="w-full rounded-md border border-neutral-200 px-3 py-2 text-left text-sm">
                            {roleOptions.find((option) => option.value === role)?.label || "Select Role"}
                          </Listbox.Button>
                          <Listbox.Options className="absolute z-10 mt-1 w-full rounded-md border border-neutral-200 bg-white text-sm shadow-lg">
                            {roleOptions.map((option) => (
                              <Listbox.Option
                                key={option.value}
                                value={option.value}
                                className={({ active }) =>
                                  `cursor-pointer px-3 py-2 ${
                                    active ? "bg-neutral-100" : "bg-white"
                                  }`
                                }
                              >
                                {option.label}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </div>
                      </Listbox>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700">Contact Number</label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                        {...register("contactNumber")}
                      />
                    </div>
                  </div>

                  {role === "student" && (
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                      <h3 className="text-sm font-semibold text-neutral-700">Student Details</h3>
                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-neutral-700">Parent Name</label>
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                            {...register("parentName")}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-neutral-700">
                            Parent Contact
                          </label>
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                            {...register("parentContact")}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-neutral-700">Program Type</label>
                          <select
                            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                            {...register("programType")}
                          >
                            <option value="">Select program</option>
                            {programOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-neutral-700">Schedule</label>
                          <input
                            type="text"
                            placeholder="Days (e.g. Mon, Wed)"
                            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                            {...register("scheduleDays")}
                          />
                          <input
                            type="text"
                            placeholder="Times (e.g. 6pm - 7pm)"
                            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                            {...register("scheduleTimes")}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {role === "teacher" && (
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                      <h3 className="text-sm font-semibold text-neutral-700">Teacher Details</h3>
                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-neutral-700">
                            Specialization
                          </label>
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                            {...register("specialization")}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-neutral-700">Join Date</label>
                          <input
                            type="date"
                            className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                            {...register("joinDate")}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
                      disabled={submitting}
                      onClick={(e) => {
                        console.log("=== SUBMIT BUTTON CLICKED ===");
                        console.log("Current form values:", getValues());
                        console.log("Form errors:", errors);
                        console.log("Form will submit now");
                      }}
                    >
                      {submitting ? "Creating..." : "Create User"}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
