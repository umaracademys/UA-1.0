"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { PermissionMatrix } from "@/components/dashboard/super-admin/PermissionMatrix";
import axios from "axios";
import toast from "react-hot-toast";

type Role = "super_admin" | "admin" | "teacher" | "student";

export default function SuperAdminPermissionsPage() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const handleSave = async (permissions: Record<Role, string[]>) => {
    try {
      await axios.post(
        "/api/settings/permissions",
        { permissions },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      toast.success("Permissions updated successfully");
    } catch (error) {
      throw new Error((error as Error).message || "Failed to save permissions");
    }
  };

  const handleReset = async () => {
    try {
      await axios.post(
        "/api/settings/permissions/reset",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      toast.success("Permissions reset to defaults");
    } catch (error) {
      throw new Error((error as Error).message || "Failed to reset permissions");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Permission Management</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage role-based permissions for all system modules
        </p>
      </div>

      {/* Permission Matrix */}
      <PermissionMatrix onSave={handleSave} onReset={handleReset} />
    </div>
  );
}
