import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const analysis = useMemo(() => {
    if (!password) {
      return { score: 0, label: "", color: "bg-muted", bars: [false, false, false, false] };
    }

    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

    let label = "Weak";
    let colorClass = "bg-rose-500";

    if (score === 2) {
      label = "Fair";
      colorClass = "bg-amber-500";
    } else if (score === 3) {
      label = "Good";
      colorClass = "bg-indigo-500";
    } else if (score === 4) {
      label = "Strong";
      colorClass = "bg-emerald-500";
    }

    return {
      score,
      label,
      color: colorClass,
      bars: [score >= 1, score >= 2, score >= 3, score >= 4],
    };
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5 animate-in fade-in duration-200">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength:</span>
        <span
          className={`font-medium ${
            analysis.score <= 1
              ? "text-rose-500 dark:text-rose-400"
              : analysis.score === 2
                ? "text-amber-500 dark:text-amber-400"
                : analysis.score === 3
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {analysis.label}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {analysis.bars.map((active, index) => (
          <div
            key={index}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              active ? analysis.color : "bg-muted/70 dark:bg-muted/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
