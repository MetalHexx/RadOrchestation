"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <ToggleGroup
      value={[theme]}
      onValueChange={(values) => {
        if (values.length > 0) {
          setTheme(values[0] as "system" | "dark" | "light");
        }
      }}
      variant="outline"
      size="sm"
      aria-label="Theme preference"
    >
      <ToggleGroupItem value="system" aria-label="System theme">
        <Monitor size={14} />
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" aria-label="Dark theme">
        <Moon size={14} />
      </ToggleGroupItem>
      <ToggleGroupItem value="light" aria-label="Light theme">
        <Sun size={14} />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
