"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { StatusIcon, ReviewVerdictBadge } from "@/components/badges";
import { DocumentLink } from "@/components/documents";
import { ProgressBar } from "./progress-bar";
import { TaskCard } from "./task-card";
import type { NormalizedPhase } from "@/types/state";

interface PhaseCardProps {
  phase: NormalizedPhase;
  isActive: boolean;
  maxRetries: number;
  onDocClick: (path: string) => void;
}

export function PhaseCard({
  phase,
  isActive,
  maxRetries,
  onDocClick,
}: PhaseCardProps) {
  const completedTasks = phase.tasks.filter(
    (t) => t.status === "complete"
  ).length;

  const borderColor =
    phase.status === "failed" || phase.status === "halted"
      ? "var(--status-failed)"
      : isActive
        ? "var(--status-in-progress)"
        : "transparent";

  return (
    <div
      className="border-l-2 rounded-md"
      style={{ borderLeftColor: borderColor }}
      aria-label={`Phase ${phase.phase_number}: ${phase.title}`}
    >
      <Accordion>
        <AccordionItem>
          <AccordionTrigger>
            <div className="flex items-center gap-2 flex-1 mr-2">
              <StatusIcon status={phase.status} />
              <span className="font-medium whitespace-nowrap">
                Phase {phase.phase_number}: {phase.title}
              </span>
              <div className="flex-1 min-w-24">
                <ProgressBar
                  completed={completedTasks}
                  total={phase.total_tasks}
                  status={phase.status}
                />
              </div>
              {phase.phase_doc && (
                <div
                  role="presentation"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <DocumentLink
                    path={phase.phase_doc}
                    label="Phase Plan"
                    onDocClick={onDocClick}
                  />
                </div>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div role="list" className="space-y-1 pl-2">
              {phase.tasks.map((task) => (
                <TaskCard
                  key={task.task_number}
                  task={task}
                  maxRetries={maxRetries}
                  onDocClick={onDocClick}
                />
              ))}
            </div>
            {(phase.phase_review_verdict || phase.phase_report || phase.phase_review) && (
              <div className="flex items-center gap-2 mt-3 pt-2 border-t pl-2">
                {phase.phase_review_verdict && (
                  <ReviewVerdictBadge verdict={phase.phase_review_verdict} />
                )}
                {phase.phase_report && (
                  <DocumentLink
                    path={phase.phase_report}
                    label="Phase Report"
                    onDocClick={onDocClick}
                  />
                )}
                {phase.phase_review && (
                  <DocumentLink
                    path={phase.phase_review}
                    label="Phase Review"
                    onDocClick={onDocClick}
                  />
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
