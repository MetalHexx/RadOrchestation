"use client";

import { Badge } from "@/components/ui/badge";
import type { PipelineTier } from "@/types/state";

interface PipelineTierBadgeProps {
  tier: PipelineTier | "not_initialized";
}

const TIER_CONFIG: Record<string, { label: string; cssVar: string }> = {
  planning: { label: "Planning", cssVar: "--tier-planning" },
  execution: { label: "Execution", cssVar: "--tier-execution" },
  review: { label: "Review", cssVar: "--tier-review" },
  complete: { label: "Complete", cssVar: "--tier-complete" },
  halted: { label: "Halted", cssVar: "--tier-halted" },
  not_initialized: { label: "Not Started", cssVar: "--tier-not-initialized" },
};

export function PipelineTierBadge({ tier }: PipelineTierBadgeProps) {
  const config = TIER_CONFIG[tier];

  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-transparent"
      style={{
        backgroundColor: `color-mix(in srgb, var(${config.cssVar}) 15%, transparent)`,
        color: `var(${config.cssVar})`,
      }}
      aria-label={`Pipeline tier: ${config.label}`}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: `var(${config.cssVar})` }}
        aria-hidden="true"
      />
      {config.label}
    </Badge>
  );
}
