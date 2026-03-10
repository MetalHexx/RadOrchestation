"use client";

import { CheckCircle2, Circle } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { GateEntry } from "@/types/components";

interface GateHistorySectionProps {
  gates: GateEntry[];
}

export function GateHistorySection({ gates }: GateHistorySectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gate History</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="list-none space-y-3">
          {gates.map((entry, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              {entry.approved ? (
                <CheckCircle2
                  className="h-4 w-4 shrink-0"
                  style={{ color: "var(--status-complete)" }}
                />
              ) : (
                <Circle
                  className="h-4 w-4 shrink-0"
                  style={{ color: "var(--status-not-started)" }}
                />
              )}
              <span>{entry.gate}</span>
              {entry.timestamp && (
                <span className="text-xs text-muted-foreground font-mono">
                  {entry.timestamp}
                </span>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
