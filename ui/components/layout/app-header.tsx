"use client";

import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConnectionIndicator } from "@/components/badges";
import { ThemeToggle } from "@/components/theme";

interface AppHeaderProps {
  sseStatus: "connected" | "reconnecting" | "disconnected";
  onReconnect: () => void;
  onConfigClick?: () => void;
}

export function AppHeader({ sseStatus, onReconnect, onConfigClick }: AppHeaderProps) {
  return (
    <header
      role="banner"
      className="sticky top-0 z-50 flex h-14 items-center justify-between border-b px-4"
      style={{
        backgroundColor: "var(--header-bg)",
        borderColor: "var(--header-border)",
      }}
    >
      <h1 className="text-sm font-semibold tracking-tight">
        Orchestration Monitor
      </h1>

      <nav aria-label="Dashboard controls" className="flex items-center gap-3">
        <ConnectionIndicator status={sseStatus} />
        {sseStatus === "disconnected" && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={onReconnect}
          >
            Retry
          </Button>
        )}

        <Button variant="ghost" size="icon" aria-label="Configuration" onClick={onConfigClick}>
          <Settings size={16} />
        </Button>

        <ThemeToggle />
      </nav>
    </header>
  );
}
