"use client";

import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface MultiSelectFilterOption {
  value: string;
  label: string;
  description?: string | null;
  accentClassName?: string;
  labelClassName?: string;
}

interface MultiSelectFilterMenuProps {
  label: string;
  icon: LucideIcon;
  options: MultiSelectFilterOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  disabled?: boolean;
  className?: string;
}

export function MultiSelectFilterMenu({
  label,
  icon: Icon,
  options,
  selectedValues,
  onToggle,
  onClear,
  disabled = false,
  className,
}: MultiSelectFilterMenuProps) {
  const selectedCount = selectedValues.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "w-full min-w-0 shrink justify-between rounded-2xl border-border/60 bg-background/80 shadow-sm backdrop-blur sm:w-auto sm:min-w-36",
            className
          )}
          disabled={disabled}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="min-w-0 truncate">{label}</span>
          </span>
          {selectedCount > 0 ? (
            <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-xs font-medium text-foreground">
              {selectedCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-72 min-w-72">
        <div className="flex items-center justify-between gap-3 px-1.5 py-1">
          <DropdownMenuLabel className="p-0">{label}</DropdownMenuLabel>
          {selectedCount > 0 ? (
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={onClear}
            >
              Clear
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator />

        {options.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">Nothing to filter yet.</div>
        ) : (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selectedValues.includes(option.value)}
              onCheckedChange={() => onToggle(option.value)}
              onSelect={(event) => event.preventDefault()}
              className="items-start py-2"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  {option.accentClassName ? (
                    <span
                      className={cn(
                        "mt-0.5 size-2.5 shrink-0 rounded-full ring-4 ring-background/70",
                        option.accentClassName
                      )}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className={cn("text-sm text-foreground", option.labelClassName)}>
                    {option.label}
                  </span>
                </div>
                {option.description ? (
                  <div className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {option.description}
                  </div>
                ) : null}
              </div>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
