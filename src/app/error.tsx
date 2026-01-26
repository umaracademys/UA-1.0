"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-red-200 bg-white p-8 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-red-100 p-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Something went wrong</h1>
            <p className="text-neutral-600">An unexpected error occurred</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <p className="mb-2 font-semibold text-neutral-900">Error:</p>
            <p className="text-sm text-red-600">{error.message || "An unknown error occurred"}</p>
            {error.digest && (
              <p className="mt-2 text-xs text-neutral-500">Error ID: {error.digest}</p>
            )}
            {process.env.NODE_ENV === "development" && error.stack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-neutral-600">Stack Trace</summary>
                <pre className="mt-2 overflow-auto rounded bg-neutral-900 p-2 text-xs text-neutral-100">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
