"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";

type PasswordStrengthIndicatorProps = {
  password: string;
};

type PasswordCriteria = {
  label: string;
  test: (password: string) => boolean;
};

const criteria: PasswordCriteria[] = [
  { label: "Minimum 8 characters", test: (pwd) => pwd.length >= 8 },
  { label: "At least one uppercase letter", test: (pwd) => /[A-Z]/.test(pwd) },
  { label: "At least one lowercase letter", test: (pwd) => /[a-z]/.test(pwd) },
  { label: "At least one number", test: (pwd) => /[0-9]/.test(pwd) },
  { label: "At least one special character", test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
];

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "" };

    const passedCriteria = criteria.filter((criterion) => criterion.test(password)).length;
    const score = (passedCriteria / criteria.length) * 100;

    if (score < 40) {
      return { score, label: "Weak", color: "bg-red-500" };
    } else if (score < 80) {
      return { score, label: "Medium", color: "bg-yellow-500" };
    } else {
      return { score, label: "Strong", color: "bg-green-500" };
    }
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2">
      {/* Progress Bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-700">Password Strength</span>
        <span className={`text-xs font-semibold ${
          strength.score < 40 ? "text-red-600" : strength.score < 80 ? "text-yellow-600" : "text-green-600"
        }`}>
          {strength.label}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
        <div
          className={`h-full transition-all duration-300 ${strength.color}`}
          style={{ width: `${strength.score}%` }}
        />
      </div>

      {/* Criteria Checklist */}
      <div className="space-y-1.5">
        {criteria.map((criterion, index) => {
          const passed = criterion.test(password);
          return (
            <div key={index} className="flex items-center gap-2 text-xs">
              {passed ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <X className="h-3.5 w-3.5 text-neutral-400" />
              )}
              <span className={passed ? "text-neutral-700" : "text-neutral-400"}>
                {criterion.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
