"use client";

import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

interface ConfigSectionProps {
  value: string;
  title: string;
  children: React.ReactNode;
}

export function ConfigSection({ value, title, children }: ConfigSectionProps) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger>{title}</AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  );
}
