"use client";

import { Lock } from "lucide-react";

export function LockBadge() {
  return (
    <Lock
      size={14}
      className="text-muted-foreground"
      role="img"
      aria-label="Locked (hard default)"
    />
  );
}
