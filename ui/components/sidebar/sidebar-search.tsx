"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SidebarSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function SidebarSearch({ value, onChange }: SidebarSearchProps) {
  return (
    <div className="relative px-4 py-2">
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-6.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filter projects…"
        aria-label="Filter projects"
        className="pl-8 text-sm"
      />
    </div>
  );
}
