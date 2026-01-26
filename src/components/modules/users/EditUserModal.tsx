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
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  fullName: z.string().min(2).optional(),
  role: z.enum(["super_admin", "admin", "teacher", "student"]).optional(),
  contactNumber: z.string().optional(),
  parentName: z.string().optional(),
  parentContact: z.string().optional(),
  programType: z.enum(["Full-Time HQ", "Part-Time HQ", "After School"]).optional(),
  scheduleDays: z.string().optional(),
  scheduleTimes: z.string().optional(),
  specialization: z.string().optional(),
  joinDate: z.string().optional(),
});

export type EditUserValues = z.infer<typeof schema>;

export type EditUserInitial = EditUserValues & {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
};

type EditUserModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (payload: EditUserValues, roleChanged: boolean) => Promise<void>;
  user?: EditUserInitial | null;
  canChangeRole?: boolean;
};

export function EditUserModal({
  open,
  onClose,
  onSave,
  user,
  canChangeRole = false,
}: EditUserModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
  } = useForm<EditUserValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (user) {
      reset({
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        contactNumber: user.contactNumber,
      });
    }
  }, [user, reset]);

  const role = watch("role") ?? user?.role;
  const initialRole = user?.role;
  const roleChanged = useMemo(() => !!role && role !== initialRole, [role, initialRole]);

  const onSubmit = async (values: EditUserValues) => {
    if (!user) return;
    if (roleChanged && !confirm("Are you sure you want to change the user role?")) {
      return;
    }

    try {
      setSubmitting(true);
      await onSave(values, roleChanged);
      toast.success("User updated successfully.");
      onClose();
    } catch (error) {
      toast.error((error as Error).message || "Failed to update user.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                  Edit User
                </Dialog.Title>
                <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-neutral-700">Email</label>
                      <input
                        type="email"
                        className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                        {...register("email")}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700">Full Name</label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                        {...register("fullName")}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700">Password</label>
                      <input
                        type="password"
                        placeholder="Leave blank to keep unchanged"
                        className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                        {...register("password")}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700">Role</label>
                      <Listbox
                        value={role}
                        disabled={!canChangeRole}
                        onChange={(value) => setValue("role", value)}
                      >
                        <div className="relative mt-1">
                          <Listbox.Button
                            className={`w-full rounded-md border border-neutral-200 px-3 py-2 text-left text-sm ${
                              !canChangeRole ? "bg-neutral-100 text-neutral-500" : ""
                            }`}
                          >
                            {roleOptions.find((option) => option.value === role)?.label}
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
                      className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                      disabled={submitting}
                    >
                      {submitting ? "Saving..." : "Save Changes"}
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
