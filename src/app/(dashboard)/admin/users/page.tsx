"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { UserList, type UserListItem } from "@/components/modules/users/UserList";
import { CreateUserModal, type CreateUserValues } from "@/components/modules/users/CreateUserModal";
import { EditUserModal, type EditUserInitial, type EditUserValues } from "@/components/modules/users/EditUserModal";
import { UserDetailsPanel, type UserDetails } from "@/components/modules/users/UserDetailsPanel";
import type { UserRole } from "@/types";
import { usePermissions } from "@/hooks/usePermissions";

type UserFilters = {
  role: UserRole | "all";
  status: "all" | "active" | "inactive";
  search: string;
};

const defaultFilters: UserFilters = {
  role: "all",
  status: "all",
  search: "",
};

export default function UsersPage() {
  const { hasPermission } = usePermissions();
  const [filters, setFilters] = useState<UserFilters>(defaultFilters);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [details, setDetails] = useState<UserDetails | null>(null);

  const canCreate = useMemo(() => hasPermission("users.create"), [hasPermission]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters.role !== "all") params.set("role", filters.role);
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);
      params.set("page", String(pagination.page));
      params.set("limit", String(pagination.limit));

      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load users.");
      }

      const mapped = (data.data ?? []).map((user: any) => ({
        id: user._id ?? user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
      }));

      setUsers(mapped);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total ?? mapped.length,
      }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (values: CreateUserValues) => {
    console.log("=== handleCreate called ===");
    console.log("Received values:", values);
    
    const payload: any = {
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      role: values.role,
      contactNumber: values.contactNumber,
    };
    
    console.log("Payload before role-specific data:", payload);

    if (values.role === "student") {
      payload.studentData = {
        parentName: values.parentName,
        parentContact: values.parentContact,
        programType: values.programType,
        schedule: {
          days: values.scheduleDays ? values.scheduleDays.split(",").map((d) => d.trim()) : [],
          times: values.scheduleTimes ? values.scheduleTimes.split(",").map((t) => t.trim()) : [],
        },
      };
    }

    if (values.role === "teacher") {
      payload.teacherData = {
        specialization: values.specialization,
        joinDate: values.joinDate ? new Date(values.joinDate) : undefined,
      };
    }

    const token = localStorage.getItem("token");
    console.log("=== Making API request ===");
    console.log("Payload:", JSON.stringify(payload, null, 2));
    console.log("Token exists:", !!token);
    
    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Response data:", data);
    
    if (!response.ok) {
      console.error("API error response:", data);
      throw new Error(data.message || "Failed to create user.");
    }

    console.log("User created successfully, refreshing list");
    await fetchUsers();
  };

  const handleEditSave = async (values: EditUserValues, roleChanged: boolean) => {
    if (!selectedUser) return;

    const patchPayload: any = {
      email: values.email,
      fullName: values.fullName,
      contactNumber: values.contactNumber,
    };

    if (selectedUser.role === "student") {
      patchPayload.studentData = {
        parentName: values.parentName,
        parentContact: values.parentContact,
        programType: values.programType,
        schedule: {
          days: values.scheduleDays ? values.scheduleDays.split(",").map((d) => d.trim()) : [],
          times: values.scheduleTimes ? values.scheduleTimes.split(",").map((t) => t.trim()) : [],
        },
      };
    }

    if (selectedUser.role === "teacher") {
      patchPayload.teacherData = {
        specialization: values.specialization,
        joinDate: values.joinDate ? new Date(values.joinDate) : undefined,
      };
    }

    const token = localStorage.getItem("token");
    const patchResponse = await fetch(`/api/users/${selectedUser.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patchPayload),
    });

    const patchData = await patchResponse.json();
    if (!patchResponse.ok) {
      throw new Error(patchData.message || "Failed to update user.");
    }

    if (roleChanged && values.role) {
      const roleResponse = await fetch(`/api/users/${selectedUser.id}/assign-role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newRole: values.role }),
      });
      const roleData = await roleResponse.json();
      if (!roleResponse.ok) {
        throw new Error(roleData.message || "Failed to update role.");
      }
    }

    await fetchUsers();
  };

  const handleDelete = async (user: UserListItem) => {
    if (!confirm(`Deactivate ${user.fullName}?`)) return;
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/users/${user.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.message || "Failed to delete user.");
      return;
    }
    toast.success("User deactivated.");
    await fetchUsers();
  };

  const handleView = async (user: UserListItem) => {
    setSelectedUser(user);
    setDetailsOpen(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users/${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load user.");
      }
      const profile = data.data?.profile ?? null;
      setDetails({
        id: data.data?._id ?? data.data?.id ?? user.id,
        fullName: data.data?.fullName ?? user.fullName,
        email: data.data?.email ?? user.email,
        role: data.data?.role ?? user.role,
        contactNumber: data.data?.contactNumber,
        isActive: data.data?.isActive,
        lastLogin: data.data?.lastLogin,
        passwordChangedAt: data.data?.passwordChangedAt,
        profile,
      });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // Debug: Log state changes
  useEffect(() => {
    console.log("UsersPage - createOpen state changed to:", createOpen);
  }, [createOpen]);
  
  // Debug: Test button click handler
  const handleCreateButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    alert("Button clicked! Opening modal..."); // Visual confirmation
    console.log("=== CREATE USER BUTTON CLICKED ===");
    console.log("Current createOpen before:", createOpen);
    setCreateOpen(true);
    console.log("Called setCreateOpen(true)");
  };

  return (
    <PermissionGuard permission="users.view" fallback={<div className="p-6">Unauthorized</div>}>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">User Management</h1>
            <p className="text-sm text-neutral-500">Manage users, roles, and access.</p>
          </div>
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors cursor-pointer"
            onClick={handleCreateButtonClick}
            type="button"
            id="create-user-button"
          >
            Create User
          </button>
        </div>

        <UserList
          users={users}
          filters={filters}
          pagination={pagination}
          loading={loading}
          error={error}
          onFilterChange={(next) => {
            setPagination((prev) => ({ ...prev, page: 1 }));
            setFilters(next);
          }}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          onView={handleView}
          onEdit={(user) => {
            setSelectedUser(user);
            setEditOpen(true);
          }}
          onDelete={handleDelete}
        />

        <CreateUserModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />
        <EditUserModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSave={handleEditSave}
          user={
            selectedUser
              ? ({
                  id: selectedUser.id,
                  role: selectedUser.role,
                  email: selectedUser.email,
                  fullName: selectedUser.fullName,
                  contactNumber: undefined,
                } as EditUserInitial)
              : null
          }
          canChangeRole={hasPermission("users.manage_roles")}
        />
        <UserDetailsPanel
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          user={details}
          onEdit={() => {
            setEditOpen(true);
            setDetailsOpen(false);
          }}
          onDelete={() => details && handleDelete(details as any)}
          onResetPassword={() => toast("Password reset is handled via the auth screen.")}
          onUnlockAccount={async () => {
            if (!details) return;
            const response = await fetch("/api/auth/unlock-account", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: details.id }),
            });
            const data = await response.json();
            if (!response.ok) {
              toast.error(data.message || "Failed to unlock account.");
              return;
            }
            toast.success("Account unlocked.");
          }}
        />
      </div>
    </PermissionGuard>
  );
}
