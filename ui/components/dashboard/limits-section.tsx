"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import type { NormalizedLimits } from "@/types/state";

interface LimitsSectionProps {
  limits: NormalizedLimits;
}

export function LimitsSection({ limits }: LimitsSectionProps) {
  return (
    <Card>
      <CardContent className="py-0">
        <Accordion defaultValue={[]}>
          <AccordionItem>
            <AccordionTrigger>Pipeline Limits</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Max Phases</span>
                  <span className="font-mono">{limits.max_phases}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Tasks per Phase</span>
                  <span className="font-mono">{limits.max_tasks_per_phase}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Retries per Task</span>
                  <span className="font-mono">{limits.max_retries_per_task}</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
