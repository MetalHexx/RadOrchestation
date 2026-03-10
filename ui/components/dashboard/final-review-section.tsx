"use client";

import { CheckCircle2, Circle } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusIcon } from "@/components/badges";
import { DocumentLink } from "@/components/documents";
import type { NormalizedFinalReview } from "@/types/state";

interface FinalReviewSectionProps {
  finalReview: NormalizedFinalReview;
  onDocClick: (path: string) => void;
}

export function FinalReviewSection({ finalReview, onDocClick }: FinalReviewSectionProps) {
  if (finalReview.status === "not_started") {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Final Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <StatusIcon status={finalReview.status} />
          <span className="capitalize">{finalReview.status.replace("_", " ")}</span>
        </div>

        <div>
          <DocumentLink
            path={finalReview.report_doc}
            label="Review Report"
            onDocClick={onDocClick}
          />
        </div>

        <div className="flex items-center gap-2 text-sm">
          {finalReview.human_approved ? (
            <>
              <CheckCircle2
                className="h-4 w-4"
                style={{ color: "var(--status-complete)" }}
              />
              <span>Human Approved</span>
            </>
          ) : (
            <>
              <Circle
                className="h-4 w-4"
                style={{ color: "var(--status-not-started)" }}
              />
              <span>Pending Approval</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
