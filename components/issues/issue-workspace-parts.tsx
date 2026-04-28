"use client";

import { X } from "lucide-react";

export function ActiveFilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-foreground shadow-sm transition-colors hover:bg-accent"
    >
      {label}
      <X className="h-3 w-3" />
    </button>
  );
}
