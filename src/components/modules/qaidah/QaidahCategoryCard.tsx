"use client";

import { BookOpen, CheckCircle2, Lock } from "lucide-react";

type QaidahCategoryCardProps = {
  name: string;
  description: string;
  lessonCount: number;
  completedCount?: number;
  isLocked?: boolean;
  onClick?: () => void;
};

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Letters: BookOpen,
  Harakat: BookOpen,
  Tanween: BookOpen,
  Sukoon: BookOpen,
  Shaddah: BookOpen,
  Madd: BookOpen,
  Advanced: BookOpen,
};

export function QaidahCategoryCard({
  name,
  description,
  lessonCount,
  completedCount = 0,
  isLocked = false,
  onClick,
}: QaidahCategoryCardProps) {
  const Icon = categoryIcons[name] || BookOpen;
  const completionPercentage = lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0;

  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={`group relative w-full rounded-lg border p-4 text-left transition-all ${
        isLocked
          ? "border-neutral-200 bg-neutral-50 opacity-60"
          : "border-neutral-200 bg-white hover:border-indigo-300 hover:shadow-md"
      }`}
    >
      {isLocked && (
        <div className="absolute right-2 top-2">
          <Lock className="h-5 w-5 text-neutral-400" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-indigo-100 p-3">
          <Icon className="h-6 w-6 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="mb-1 font-semibold text-neutral-900">{name}</h3>
          <p className="mb-2 text-xs text-neutral-600 line-clamp-2">{description}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">
              {completedCount} / {lessonCount} lessons
            </span>
            {lessonCount > 0 && (
              <div className="flex-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full bg-indigo-600 transition-all"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
