"use client";

import { useRouter } from "next/navigation";
import {
  FileText,
  Upload,
  BookOpen,
  MessageSquare,
  Star,
  Calendar,
  ClipboardList,
} from "lucide-react";

type QuickAction = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: "blue" | "green" | "purple" | "orange" | "indigo";
};

const actions: QuickAction[] = [
  {
    id: "assignments",
    label: "View Assignments",
    icon: FileText,
    href: "/student/assignments",
    color: "blue",
  },
  {
    id: "submit",
    label: "Submit Assignment",
    icon: Upload,
    href: "/student/assignments?action=submit",
    color: "green",
  },
  {
    id: "mushaf",
    label: "Personal Mushaf",
    icon: BookOpen,
    href: "/student/personal-mushaf",
    color: "purple",
  },
  {
    id: "messages",
    label: "Send Message",
    icon: MessageSquare,
    href: "/messages",
    color: "orange",
  },
  {
    id: "evaluations",
    label: "View Evaluations",
    icon: Star,
    href: "/student/evaluations",
    color: "indigo",
  },
  {
    id: "schedule",
    label: "View Schedule",
    icon: Calendar,
    href: "/student/schedule",
    color: "blue",
  },
  {
    id: "recitation",
    label: "Recitation History",
    icon: ClipboardList,
    href: "/student/recitation",
    color: "purple",
  },
];

const colorClasses = {
  blue: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
  green: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
  purple: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200",
  orange: "bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200",
  indigo: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200",
};

export function QuickActions() {
  const router = useRouter();

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="mb-4 text-lg font-semibold text-neutral-900">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => router.push(action.href)}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-4 transition-colors ${colorClasses[action.color]}`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-center text-xs font-medium">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
