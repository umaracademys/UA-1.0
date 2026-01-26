"use client";

import { FileQuestion, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function NotFound() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [dashboardPath, setDashboardPath] = useState("/");

  useEffect(() => {
    setMounted(true);
    if (user) {
      setDashboardPath(`/${user.role}`);
    }
  }, [user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
            <FileQuestion className="h-10 w-10 text-indigo-600" />
          </div>
        </div>
        <h1 className="mb-2 text-4xl font-bold text-neutral-900">404</h1>
        <h2 className="mb-4 text-2xl font-semibold text-neutral-700">Page Not Found</h2>
        <p className="mb-8 text-neutral-600">
          The page you're looking for doesn't exist or has been moved. Please check the URL or
          navigate back to the homepage.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {mounted && user && (
            <Link
              href={dashboardPath}
              className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          )}
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <Home className="h-4 w-4" />
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
