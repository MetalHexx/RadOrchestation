"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WarningBadge } from "@/components/badges";

interface MalformedStateViewProps {
  projectName: string;
  errorMessage: string;
}

export function MalformedStateView({
  projectName,
  errorMessage,
}: MalformedStateViewProps) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card
        className="max-w-md border-2 text-center"
        style={{
          borderColor: "var(--color-warning)",
          backgroundColor: "color-mix(in srgb, var(--color-warning) 5%, var(--card))",
        }}
      >
        <CardHeader>
          <CardTitle className="text-base">{projectName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <WarningBadge message="Malformed State" />
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </CardContent>
      </Card>
    </div>
  );
}
