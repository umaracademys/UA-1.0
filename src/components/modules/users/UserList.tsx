"use client";

import { useMemo } from "react";

import { usePermissions } from "@/hooks/usePermissions";
import type { UserRole } from "@/types";

export type UserListItem = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string | Date | null;
};

type Filters = {
  role: UserRole | "all";
  status: "all" | "active" | "inactive";
  search: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
};

type UserListProps = {
  users: UserListItem[];
  filters: Filters;
  pagination: Pagination;
  loading?: boolean;
  error?: string | null;
  onFilterChange: (filters: Filters) => void;
  onPageChange: (page: number) => void;
  onView: (user: UserListItem) => void;
  onEdit: (user: UserListItem) => void;
  onDelete: (user: UserListItem) => void;
};

const roleBadgeStyles: Record<UserRole, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  teacher: "bg-green-100 text-green-700",
  student: "bg-gray-100 text-gray-700",
};

export function UserList({
  users,
  filters,
  pagination,
  loading,
  error,
  onFilterChange,
  onPageChange,
  onView,
  onEdit,
  onDelete,
}: UserListProps) {
  const { hasPermission } = usePermissions();

  const canEdit = useMemo(() => hasPermission("users.edit"), [hasPermission]);
  const canDelete = useMemo(() => hasPermission("users.delete"), [hasPermission]);

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Role</label>
          <select
            className="rounded-md border border-neutral-200 px-3 py-2 text-sm"
            value={filters.role}
            onChange={(event) =>
              onFilterChange({ ...filters, role: event.target.value as Filters["role"] })
            }
          >
            <option value="all">All</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Status</label>
          <select
            className="rounded-md border border-neutral-200 px-3 py-2 text-sm"
            value={filters.status}
            onChange={(event) =>
              onFilterChange({ ...filters, status: event.target.value as Filters["status"] })
            }
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Search</label>
          <input
            className="rounded-md border border-neutral-200 px-3 py-2 text-sm"
            placeholder="Search by name or email"
            value={filters.search}
            onChange={(event) => onFilterChange({ ...filters, search: event.target.value })}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Role</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Last Login</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                    Loading users...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="cursor-pointer hover:bg-neutral-50"
                    onClick={() => onView(user)}
                  >
                    <td className="px-4 py-3 font-medium text-neutral-900">{user.fullName}</td>
                    <td className="px-4 py-3 text-neutral-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeStyles[user.role]}`}
                      >
                        {user.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                          onClick={(event) => {
                            event.stopPropagation();
                            onView(user);
                          }}
                        >
                          View
                        </button>
                        {canEdit && (
                          <button
                            className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEdit(user);
                            }}
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDelete(user);
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 text-sm">
          <span className="text-neutral-600">
            Page {pagination.page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 disabled:opacity-50"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              Previous
            </button>
            <button
              className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 disabled:opacity-50"
              disabled={pagination.page >= totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
