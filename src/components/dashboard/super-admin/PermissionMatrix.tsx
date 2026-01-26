"use client";

"use client";

import React, { useState } from "react";
import { Save, RotateCcw, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { MODULE_PERMISSIONS } from "@/constants/permissions";
import { ROLE_PERMISSIONS } from "@/constants/rolePermissions";

type Role = "super_admin" | "admin" | "teacher" | "student";

type PermissionMatrixProps = {
  onSave?: (permissions: Record<Role, string[]>) => Promise<void>;
  onReset?: () => Promise<void>;
};

export function PermissionMatrix({ onSave, onReset }: PermissionMatrixProps) {
  const [permissions, setPermissions] = useState<Record<Role, Set<string>>>(() => {
    const initial: Record<Role, Set<string>> = {
      super_admin: new Set(),
      admin: new Set(),
      teacher: new Set(),
      student: new Set(),
    };

    // Initialize from ROLE_PERMISSIONS
    Object.entries(ROLE_PERMISSIONS).forEach(([role, perms]) => {
      initial[role as Role] = new Set(perms);
    });

    return initial;
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const roles: Role[] = ["super_admin", "admin", "teacher", "student"];

  const togglePermission = (role: Role, permission: string) => {
    setPermissions((prev) => {
      const newPerms = { ...prev };
      const rolePerms = new Set(newPerms[role]);
      
      if (rolePerms.has(permission)) {
        rolePerms.delete(permission);
      } else {
        rolePerms.add(permission);
      }
      
      newPerms[role] = rolePerms;
      setHasChanges(true);
      return newPerms;
    });
  };

  const toggleAllForRole = (role: Role, enable: boolean) => {
    setPermissions((prev) => {
      const newPerms = { ...prev };
      const allPermissions = Object.values(MODULE_PERMISSIONS).flatMap((module) =>
        Object.values(module),
      );

      if (enable) {
        newPerms[role] = new Set(allPermissions);
      } else {
        newPerms[role] = new Set();
      }
      
      setHasChanges(true);
      return newPerms;
    });
  };

  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      const permissionsToSave: Record<Role, string[]> = {
        super_admin: Array.from(permissions.super_admin),
        admin: Array.from(permissions.admin),
        teacher: Array.from(permissions.teacher),
        student: Array.from(permissions.student),
      };

      await onSave(permissionsToSave);
      setHasChanges(false);
      toast.success("Permissions updated successfully");
    } catch (error) {
      toast.error((error as Error).message || "Failed to save permissions");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all permissions to defaults? This cannot be undone.")) {
      return;
    }

    if (!onReset) return;

    try {
      await onReset();
      // Reset to default permissions
      const defaultPerms: Record<Role, Set<string>> = {
        super_admin: new Set(),
        admin: new Set(),
        teacher: new Set(),
        student: new Set(),
      };

      Object.entries(ROLE_PERMISSIONS).forEach(([role, perms]) => {
        defaultPerms[role as Role] = new Set(perms);
      });

      setPermissions(defaultPerms);
      setHasChanges(false);
      toast.success("Permissions reset to defaults");
    } catch (error) {
      toast.error((error as Error).message || "Failed to reset permissions");
    }
  };

  const allPermissions = Object.entries(MODULE_PERMISSIONS).flatMap(([moduleName, module]) =>
    Object.entries(module).map(([key, permission]) => ({
      category: moduleName,
      key,
      permission,
    })),
  );

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900">Permission Matrix</h3>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-xs text-yellow-600">You have unsaved changes</span>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full">
          <thead className="bg-neutral-50">
            <tr>
              <th className="sticky left-0 z-10 bg-neutral-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-700">
                Permission
              </th>
              {roles.map((role) => (
                <th key={role} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  <div className="flex flex-col items-center gap-1">
                    <span className="capitalize">{role.replace("_", " ")}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleAllForRole(role, true)}
                        className="rounded px-1 text-xs text-green-600 hover:bg-green-50"
                        title="Enable all"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => toggleAllForRole(role, false)}
                        className="rounded px-1 text-xs text-red-600 hover:bg-red-50"
                        title="Disable all"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {Object.entries(MODULE_PERMISSIONS).map(([moduleName, module]) => (
              <React.Fragment key={moduleName}>
                <tr className="bg-neutral-50">
                  <td colSpan={roles.length + 1} className="px-4 py-2 font-semibold text-neutral-900">
                    {moduleName.replace("_", " ").toUpperCase()}
                  </td>
                </tr>
                {Object.entries(module).map(([key, permission]) => (
                  <tr key={permission} className="hover:bg-neutral-50">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm text-neutral-900">
                      {permission.replace(moduleName.toLowerCase() + ".", "").replace("_", " ")}
                    </td>
                    {roles.map((role) => (
                      <td key={role} className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={permissions[role].has(permission)}
                          onChange={() => togglePermission(role, permission)}
                          className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
