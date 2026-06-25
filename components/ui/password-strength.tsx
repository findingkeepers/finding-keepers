"use client";

import { evaluatePassword } from "@/lib/password";
import { cn } from "@/lib/utils";

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const { score, label, checks, suggestions } = evaluatePassword(password);
  const colors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-emerald-500"];

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full bg-muted",
              i <= score - 1 && colors[score - 1]
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Strength: <span className="font-medium text-fk-plum">{label}</span>
      </p>
      <ul className="space-y-1 text-xs text-muted-foreground">
        <li className={checks.length ? "text-emerald-700" : ""}>
          {checks.length ? "✓" : "○"} At least 8 characters
        </li>
        <li className={checks.uppercase ? "text-emerald-700" : ""}>
          {checks.uppercase ? "✓" : "○"} Uppercase letter
        </li>
        <li className={checks.lowercase ? "text-emerald-700" : ""}>
          {checks.lowercase ? "✓" : "○"} Lowercase letter
        </li>
        <li className={checks.number ? "text-emerald-700" : ""}>
          {checks.number ? "✓" : "○"} Number
        </li>
        <li className={checks.special ? "text-emerald-700" : ""}>
          {checks.special ? "✓" : "○"} Special character
        </li>
      </ul>
      {suggestions.length > 0 && score < 4 && (
        <p className="text-xs text-fk-mauve">{suggestions.join(" · ")}</p>
      )}
    </div>
  );
}