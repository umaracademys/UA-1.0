"use client";

import { useEffect, useState } from "react";

type TypingIndicatorProps = {
  users: Array<{ userId: string; email: string }>;
};

export function TypingIndicator({ users }: TypingIndicatorProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Auto-hide after 3 seconds
    const timer = setTimeout(() => {
      setVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [users]);

  if (users.length === 0 || !visible) return null;

  const names = users.map((u) => u.email.split("@")[0]).join(", ");

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-500">
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" />
      </div>
      <span>{names} {users.length === 1 ? "is" : "are"} typing...</span>
    </div>
  );
}
