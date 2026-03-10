"use client";

import { cn } from "@/lib/utils";

type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
}

const CONNECTION_CONFIG: Record<
  ConnectionStatus,
  { label: string; cssVar: string; pulse: boolean }
> = {
  connected: { label: "Connected", cssVar: "--connection-ok", pulse: false },
  reconnecting: { label: "Reconnecting\u2026", cssVar: "--connection-warning", pulse: true },
  disconnected: { label: "Disconnected", cssVar: "--connection-error", pulse: false },
};

export function ConnectionIndicator({ status }: ConnectionIndicatorProps) {
  const config = CONNECTION_CONFIG[status];

  return (
    <div className="inline-flex items-center gap-2" aria-live="polite">
      <span
        className={cn("inline-block h-2 w-2 rounded-full", config.pulse && "animate-pulse")}
        style={{ backgroundColor: `var(${config.cssVar})` }}
      />
      <span className="text-xs text-muted-foreground">{config.label}</span>
    </div>
  );
}
