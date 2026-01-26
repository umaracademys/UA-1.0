"use client";

import { LucideIcon, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

type HealthStatus = "healthy" | "degraded" | "unhealthy";

type HealthCardProps = {
  title: string;
  status: HealthStatus;
  icon: LucideIcon;
  responseTime?: string | number;
  usage?: string | number;
  total?: string;
  value?: string | number;
};

const statusColors = {
  healthy: {
    bg: "bg-green-50",
    border: "border-green-200",
    icon: "text-green-600",
    dot: "bg-green-500",
  },
  degraded: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    icon: "text-yellow-600",
    dot: "bg-yellow-500",
  },
  unhealthy: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "text-red-600",
    dot: "bg-red-500",
  },
};

const statusIcons = {
  healthy: CheckCircle,
  degraded: AlertTriangle,
  unhealthy: AlertCircle,
};

export function HealthCard({
  title,
  status,
  icon: Icon,
  responseTime,
  usage,
  total,
  value,
}: HealthCardProps) {
  const colors = statusColors[status];
  const StatusIcon = statusIcons[status];

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${colors.icon} bg-white`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-700">{title}</p>
            {value !== undefined && (
              <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
            )}
            {responseTime && (
              <p className="mt-1 text-xs text-neutral-600">Response: {responseTime}ms</p>
            )}
            {usage !== undefined && total && (
              <p className="mt-1 text-xs text-neutral-600">
                {usage}% used ({total} total)
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusIcon className={`h-5 w-5 ${colors.icon}`} />
          <span className={`text-xs font-medium capitalize ${colors.icon}`}>{status}</span>
        </div>
      </div>
    </div>
  );
}
