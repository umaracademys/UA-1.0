"use client";

import { AlertCircle, X, Shield, Ban } from "lucide-react";
import { format } from "date-fns";

type SecurityAlertProps = {
  id: string;
  type: "failed_login" | "locked_account" | "suspicious_activity" | "password_change" | "permission_change";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  user?: {
    fullName: string;
    email: string;
  };
  ipAddress?: string;
  timestamp: Date | string;
  onInvestigate?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onBlock?: (id: string, type: "user" | "ip") => void;
};

const severityColors = {
  low: "bg-blue-50 border-blue-200 text-blue-800",
  medium: "bg-yellow-50 border-yellow-200 text-yellow-800",
  high: "bg-orange-50 border-orange-200 text-orange-800",
  critical: "bg-red-50 border-red-200 text-red-800",
};

const severityIcons = {
  low: AlertCircle,
  medium: AlertCircle,
  high: AlertCircle,
  critical: AlertCircle,
};

export function SecurityAlert({
  id,
  type,
  severity,
  title,
  description,
  user,
  ipAddress,
  timestamp,
  onInvestigate,
  onDismiss,
  onBlock,
}: SecurityAlertProps) {
  const colors = severityColors[severity];
  const Icon = severityIcons[severity];

  return (
    <div className={`rounded-lg border ${colors} p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase">{severity}</span>
              <span className="text-xs opacity-75">{type.replace("_", " ")}</span>
            </div>
            <h4 className="font-semibold text-neutral-900">{title}</h4>
            <p className="mt-1 text-sm text-neutral-700">{description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-600">
              {user && (
                <span>
                  User: <span className="font-medium">{user.fullName}</span> ({user.email})
                </span>
              )}
              {ipAddress && (
                <span>
                  IP: <span className="font-medium">{ipAddress}</span>
                </span>
              )}
              <span>{format(new Date(timestamp), "MMM dd, yyyy 'at' h:mm a")}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-4">
          {onInvestigate && (
            <button
              onClick={() => onInvestigate(id)}
              className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100"
              title="Investigate"
            >
              <Shield className="h-4 w-4" />
            </button>
          )}
          {onBlock && (user || ipAddress) && (
            <button
              onClick={() => onBlock(id, user ? "user" : "ip")}
              className="rounded-md p-1.5 text-red-600 hover:bg-red-100"
              title="Block"
            >
              <Ban className="h-4 w-4" />
            </button>
          )}
          {onDismiss && (
            <button
              onClick={() => onDismiss(id)}
              className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
