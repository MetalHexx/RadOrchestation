"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineTierBadge } from "@/components/badges";
import type { PipelineTier, HumanGateMode } from "@/types/state";

interface ProjectHeaderProps {
  project: {
    name: string;
    description: string | null;
    created: string;
    updated: string;
  };
  tier: PipelineTier;
  gateMode: HumanGateMode;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ProjectHeader({ project, tier, gateMode }: ProjectHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">{project.name}</h1>
        <PipelineTierBadge tier={tier} />
        <Badge variant="outline" className="text-xs">
          {gateMode}
        </Badge>
      </div>

      {project.description && (
        <p className="text-sm text-muted-foreground">{project.description}</p>
      )}

      <div role="group" aria-label="Project metadata" className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-muted-foreground font-mono">
          Created: {formatTimestamp(project.created)}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          Updated: {formatTimestamp(project.updated)}
        </span>
        <span className="text-xs text-muted-foreground">
          Read-only monitoring
        </span>
      </div>
    </div>
  );
}

export function ProjectHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-72" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-3 w-36" />
      </div>
    </div>
  );
}
