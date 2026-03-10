"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PhaseCard } from "./phase-card";
import type { NormalizedExecution, NormalizedLimits } from "@/types/state";

interface ExecutionSectionProps {
  execution: NormalizedExecution;
  limits: NormalizedLimits;
  onDocClick: (path: string) => void;
}

export function ExecutionSection({
  execution,
  limits,
  onDocClick,
}: ExecutionSectionProps) {
  if (execution.status === "not_started") {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {execution.phases.map((phase) => (
            <PhaseCard
              key={phase.phase_number}
              phase={phase}
              isActive={phase.phase_number === execution.current_phase}
              maxRetries={limits.max_retries_per_task}
              onDocClick={onDocClick}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ExecutionSectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
