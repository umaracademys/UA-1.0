"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Redirect authenticated users to their dashboard
        switch (user.role) {
          case "student":
            router.push("/student");
            break;
          case "teacher":
            router.push("/teacher");
            break;
          case "admin":
            router.push("/admin");
            break;
          case "super_admin":
            router.push("/super-admin");
            break;
          default:
            router.push("/login");
        }
      } else {
        // Redirect unauthenticated users to login
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  // Show loading state while checking authentication
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
        <p className="mt-4 text-sm text-neutral-600">Loading...</p>
      </div>
    </div>
  );
}
