"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentLink } from "@/components/documents";

interface NotInitializedViewProps {
  projectName: string;
  brainstormingDoc?: string | null;
  onDocClick: (path: string) => void;
}

export function NotInitializedView({
  projectName,
  brainstormingDoc,
  onDocClick,
}: NotInitializedViewProps) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-base">{projectName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <h2 className="text-lg font-semibold">Not Initialized</h2>
          <p className="text-sm text-muted-foreground">
            This project does not have a <code className="font-mono text-xs">state.json</code> file
            yet. Start the orchestration pipeline to initialize it.
          </p>
          <DocumentLink
            path={brainstormingDoc ?? null}
            label="View Brainstorming Document"
            onDocClick={onDocClick}
          />
        </CardContent>
      </Card>
    </div>
  );
}
