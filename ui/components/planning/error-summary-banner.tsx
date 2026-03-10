"use client";

import { AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface ErrorSummaryBannerProps {
  blockers: string[];
  totalRetries: number;
  totalHalts: number;
}

export function ErrorSummaryBanner({
  blockers,
  totalRetries,
  totalHalts,
}: ErrorSummaryBannerProps) {
  if (blockers.length === 0) {
    return null;
  }

  return (
    <Alert
      variant="destructive"
      className="rounded-lg"
      style={{
        backgroundColor: "var(--color-error-bg)",
        borderColor: "var(--color-error-border)",
        borderWidth: "1px",
        borderStyle: "solid",
      }}
      role="alert"
      aria-live="assertive"
    >
      <AlertTriangle size={16} />
      <AlertTitle className="text-sm font-medium">
        Active Blockers ({blockers.length})
      </AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4">
          {blockers.map((blocker, index) => (
            <li key={index} className="text-sm">
              {blocker}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-2">
          Total retries: {totalRetries} · Total halts: {totalHalts}
        </p>
      </AlertDescription>
    </Alert>
  );
}
