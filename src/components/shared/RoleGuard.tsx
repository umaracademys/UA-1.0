"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type { UserRole } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

type RoleGuardProps = {
  allowedRoles: UserRole[];
  children: React.ReactNode;
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-10 text-sm text-neutral-500">
    Loading...
  </div>
);

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !allowedRoles.includes(user.role))) {
      router.push("/unauthorized");
    }
  }, [user, loading, allowedRoles, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
