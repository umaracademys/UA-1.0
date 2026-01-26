"use client";

type UnreadBadgeProps = {
  count: number;
  className?: string;
};

export function UnreadBadge({ count, className = "" }: UnreadBadgeProps) {
  if (count === 0) return null;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white min-w-[1.25rem] ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
