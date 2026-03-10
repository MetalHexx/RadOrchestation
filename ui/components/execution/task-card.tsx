"use client";

import {
  StatusIcon,
  RetryBadge,
  SeverityBadge,
  ReviewVerdictBadge,
} from "@/components/badges";
import { DocumentLink } from "@/components/documents";
import type { NormalizedTask } from "@/types/state";

interface TaskCardProps {
  task: NormalizedTask;
  maxRetries: number;
  onDocClick: (path: string) => void;
}

export function TaskCard({ task, maxRetries, onDocClick }: TaskCardProps) {
  return (
    <div className="space-y-1">
      <div
        role="listitem"
        aria-label={`Task ${task.task_number}: ${task.title}, status: ${task.status}`}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/30"
      >
        <StatusIcon status={task.status} />
        <span className="flex-1 text-sm font-medium truncate">
          T{task.task_number}: {task.title}
        </span>
        <div className="flex items-center gap-1">
          {task.review_verdict !== null && (
            <ReviewVerdictBadge verdict={task.review_verdict} />
          )}
          {task.retries > 0 && (
            <RetryBadge retries={task.retries} max={maxRetries} />
          )}
          <DocumentLink path={task.handoff_doc} label="Handoff" onDocClick={onDocClick} />
          <DocumentLink path={task.report_doc} label="Report" onDocClick={onDocClick} />
          <DocumentLink path={task.review_doc} label="Review" onDocClick={onDocClick} />
        </div>
      </div>
      {task.last_error && (
        <div className="flex items-center gap-2 px-2 pl-8">
          <span className="text-xs text-destructive truncate">
            {task.last_error}
          </span>
          <SeverityBadge severity={task.severity} />
        </div>
      )}
    </div>
  );
}
