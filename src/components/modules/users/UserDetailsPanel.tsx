"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

import type { UserRole } from "@/types";

export type UserDetails = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  contactNumber?: string;
  isActive?: boolean;
  lastLogin?: string | Date | null;
  passwordChangedAt?: string | Date | null;
  profile?: Record<string, unknown> | null;
  assignedTeachers?: Array<{ id: string; name: string }> | null;
  assignedStudentsCount?: number;
  recentEvaluations?: Array<{ id: string; status: string; date: string }>;
  recentTickets?: Array<{ id: string; status: string; workflowStep: string }>;
};

type UserDetailsPanelProps = {
  open: boolean;
  onClose: () => void;
  user?: UserDetails | null;
  onEdit: () => void;
  onDelete: () => void;
  onResetPassword: () => void;
  onUnlockAccount: () => void;
};

export function UserDetailsPanel({
  open,
  onClose,
  user,
  onEdit,
  onDelete,
  onResetPassword,
  onUnlockAccount,
}: UserDetailsPanelProps) {
  return (
    <Transition show={open} as={Fragment}>
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

        <div className="fixed inset-0 flex justify-end">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="ease-in duration-150"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl">
              <Dialog.Title className="text-lg font-semibold text-neutral-900">
                User Details
              </Dialog.Title>

              {!user ? (
                <div className="py-10 text-center text-neutral-500">Select a user to view details.</div>
              ) : (
                <div className="mt-4 space-y-6">
                  <div className="space-y-2">
                    <p className="text-sm text-neutral-500">Profile</p>
                    <h3 className="text-xl font-semibold text-neutral-900">{user.fullName}</h3>
                    <p className="text-sm text-neutral-600">{user.email}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-neutral-600">
                      <span className="rounded-full bg-neutral-100 px-2 py-1">
                        {user.role.replace("_", " ")}
                      </span>
                      <span className="rounded-full bg-neutral-100 px-2 py-1">
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm text-neutral-700">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Contact</span>
                      <span>{user.contactNumber || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Last login</span>
                      <span>
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Password updated</span>
                      <span>
                        {user.passwordChangedAt
                          ? new Date(user.passwordChangedAt).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                  </div>

                  {user.role === "student" && (
                    <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                      <h4 className="text-sm font-semibold text-neutral-700">Student Details</h4>
                      <p className="text-sm text-neutral-600">
                        Current recitation: {(user.profile as any)?.currentSabq ?? "—"}
                      </p>
                      <p className="text-sm text-neutral-600">
                        Assigned teachers: {user.assignedTeachers?.length ?? 0}
                      </p>
                      <p className="text-sm text-neutral-600">
                        Recent evaluations: {user.recentEvaluations?.length ?? 0}
                      </p>
                    </div>
                  )}

                  {user.role === "teacher" && (
                    <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                      <h4 className="text-sm font-semibold text-neutral-700">Teacher Details</h4>
                      <p className="text-sm text-neutral-600">
                        Assigned students: {user.assignedStudentsCount ?? 0}
                      </p>
                      <p className="text-sm text-neutral-600">
                        Recent tickets: {user.recentTickets?.length ?? 0}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-700">Actions</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-md border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                        onClick={onEdit}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        onClick={onDelete}
                      >
                        Delete
                      </button>
                      <button
                        className="rounded-md border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                        onClick={onResetPassword}
                      >
                        Reset Password
                      </button>
                      <button
                        className="rounded-md border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                        onClick={onUnlockAccount}
                      >
                        Unlock Account
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
