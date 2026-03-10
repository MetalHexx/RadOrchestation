"use client";

import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface WarningBadgeProps {
  message: string;
}

export function WarningBadge({ message }: WarningBadgeProps) {
  return (
    <Badge
      variant="outline"
      className="gap-1"
      style={{
        color: "var(--color-warning)",
        borderColor: "var(--color-warning)",
      }}
      aria-label={`Warning: ${message}`}
    >
      <AlertTriangle size={14} />
      {message}
    </Badge>
  );
}
