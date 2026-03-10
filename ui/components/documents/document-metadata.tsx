"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { DocumentFrontmatter } from "@/types/components";

interface DocumentMetadataProps {
  /** Extracted frontmatter from the document */
  frontmatter: DocumentFrontmatter;
}

const DATE_KEYS = new Set(["created", "updated"]);

const VERDICT_COLORS: Record<string, string> = {
  approved: "text-green-600 dark:text-green-400",
  passed: "text-green-600 dark:text-green-400",
  rejected: "text-red-600 dark:text-red-400",
  failed: "text-red-600 dark:text-red-400",
  pending: "text-yellow-600 dark:text-yellow-400",
  in_progress: "text-blue-600 dark:text-blue-400",
};

const STATUS_COLORS: Record<string, string> = {
  complete: "text-green-600 dark:text-green-400",
  active: "text-blue-600 dark:text-blue-400",
  failed: "text-red-600 dark:text-red-400",
  halted: "text-red-600 dark:text-red-400",
  pending: "text-yellow-600 dark:text-yellow-400",
  in_progress: "text-blue-600 dark:text-blue-400",
  not_started: "text-muted-foreground",
};

function formatValue(key: string, value: unknown): { text: string; className?: string } {
  if (DATE_KEYS.has(key) && typeof value === "string") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return { text: date.toLocaleDateString() };
    }
  }

  const strValue = String(value);

  if (key === "verdict") {
    const color = VERDICT_COLORS[strValue.toLowerCase()];
    return { text: strValue, className: color };
  }

  if (key === "status") {
    const color = STATUS_COLORS[strValue.toLowerCase()];
    return { text: strValue, className: color };
  }

  return { text: strValue };
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DocumentMetadata({ frontmatter }: DocumentMetadataProps) {
  const entries = Object.entries(frontmatter).filter(
    ([, value]) => value !== null && value !== undefined
  );

  if (entries.length === 0) {
    return null;
  }

  return (
    <Card size="sm" className="bg-muted">
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {entries.map(([key, value]) => {
            const { text, className } = formatValue(key, value);
            return (
              <div key={key} className="contents">
                <dt className="text-muted-foreground font-medium">
                  {formatKey(key)}
                </dt>
                <dd className={className}>{text}</dd>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}
