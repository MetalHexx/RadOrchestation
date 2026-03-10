"use client";

import { Badge } from "@/components/ui/badge";

interface RetryBadgeProps {
  retries: number;
  max: number;
}

export function RetryBadge({ retries, max }: RetryBadgeProps) {
  const isMaxed = retries === max;

  return (
    <Badge
      variant={isMaxed ? "outline" : "secondary"}
      style={
        isMaxed
          ? {
              color: "var(--color-warning)",
              borderColor: "var(--color-warning)",
            }
          : undefined
      }
      aria-label={`Retry count: ${retries} of ${max}`}
    >
      Retries: {retries}/{max}
    </Badge>
  );
}
