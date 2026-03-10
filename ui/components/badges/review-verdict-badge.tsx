"use client";

import { Badge } from "@/components/ui/badge";
import type { ReviewVerdict } from "@/types/state";

interface ReviewVerdictBadgeProps {
  verdict: ReviewVerdict | null;
}

const VERDICT_CONFIG: Record<ReviewVerdict, { label: string; cssVar: string }> = {
  approved: { label: "Approved", cssVar: "--verdict-approved" },
  changes_requested: { label: "Changes Requested", cssVar: "--verdict-changes-requested" },
  rejected: { label: "Rejected", cssVar: "--verdict-rejected" },
};

export function ReviewVerdictBadge({ verdict }: ReviewVerdictBadgeProps) {
  if (verdict === null) return null;

  const config = VERDICT_CONFIG[verdict];

  return (
    <Badge
      variant="outline"
      style={{
        backgroundColor: `color-mix(in srgb, var(${config.cssVar}) 15%, transparent)`,
        color: `var(${config.cssVar})`,
        borderColor: 'transparent',
      }}
      aria-label={`Review verdict: ${config.label}`}
    >
      {config.label}
    </Badge>
  );
}
