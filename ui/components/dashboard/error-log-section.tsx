"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { NormalizedErrors } from "@/types/state";

interface ErrorLogSectionProps {
  errors: NormalizedErrors;
}

export function ErrorLogSection({ errors }: ErrorLogSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <span>
            Total Retries: <span className="font-mono">{errors.total_retries}</span>
          </span>
          <span>
            Total Halts: <span className="font-mono">{errors.total_halts}</span>
          </span>
        </div>

        {errors.active_blockers.length > 0 ? (
          <ul className="space-y-1 text-sm text-destructive">
            {errors.active_blockers.map((blocker, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="select-none" aria-hidden="true">•</span>
                <span>{blocker}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No active blockers</p>
        )}
      </CardContent>
    </Card>
  );
}
