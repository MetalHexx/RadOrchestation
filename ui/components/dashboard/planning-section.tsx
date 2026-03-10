"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PlanningChecklist } from "@/components/planning";
import type { PlanningStepName, PlanningStepStatus, PlanningStatus } from "@/types/state";

interface PlanningSectionProps {
  planning: {
    status: PlanningStatus;
    steps: Record<PlanningStepName, {
      status: PlanningStepStatus;
      output: string | null;
    }>;
    human_approved: boolean;
  };
  onDocClick: (path: string) => void;
}

export function PlanningSection({ planning, onDocClick }: PlanningSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Planning Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <PlanningChecklist
          steps={planning.steps}
          humanApproved={planning.human_approved}
          onDocClick={onDocClick}
        />
      </CardContent>
    </Card>
  );
}
