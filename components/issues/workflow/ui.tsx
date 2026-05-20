import type { ComponentType, ReactNode } from "react";

import { ChevronDown, CircleDot, LayoutGrid, Table2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ViewMode } from "@/hooks/use-persisted-view-mode";

import { ALL_VALUE } from "./constants";

export function getIssueCompletion(total: number, done: number) {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${value}%` }} />
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center">
      <CircleDot className="h-7 w-7 text-muted-foreground" />
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

export function ViewModeToggle({
  viewMode,
  onChange,
}: {
  viewMode: ViewMode;
  onChange: (viewMode: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border/70 bg-background p-1">
      <Button
        type="button"
        variant={viewMode === "grid" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onChange("grid")}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Card
      </Button>
      <Button
        type="button"
        variant={viewMode === "table" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onChange("table")}
      >
        <Table2 className="h-3.5 w-3.5" />
        Excel
      </Button>
    </div>
  );
}

export function EntityFilterSelect({
  value,
  onValueChange,
  label,
  items,
  disabled,
}: {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  items: { id: string; name: string }[];
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>{label}: All</SelectItem>
        {items.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FilterSelect<T extends string>({
  value,
  onValueChange,
  label,
  options,
}: {
  value: T | typeof ALL_VALUE;
  onValueChange: (value: string) => void;
  label: string;
  options: readonly { value: T; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>{label}: All</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function MultiFilterSelect<T extends string>({
  values,
  onValuesChange,
  label,
  options,
  disabled,
  emptyLabel = "All",
  showAllOption = true,
}: {
  values: T[];
  onValuesChange: (values: T[]) => void;
  label: string;
  options: readonly { value: T; label: string }[];
  disabled?: boolean;
  emptyLabel?: string;
  showAllOption?: boolean;
}) {
  const selectedValueSet = new Set(values);
  const selectedLabels = options
    .filter((option) => selectedValueSet.has(option.value))
    .map((option) => option.label);
  const triggerLabel =
    selectedLabels.length === 0
      ? `${label}: ${emptyLabel}`
      : selectedLabels.length === 1
        ? `${label}: ${selectedLabels[0]}`
        : `${label}: ${selectedLabels.length} selected`;

  function toggleValue(value: T) {
    const nextValues = selectedValueSet.has(value)
      ? values.filter((currentValue) => currentValue !== value)
      : [...values, value];

    onValuesChange(nextValues);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between rounded-full border-border/60 bg-background/80 px-3 font-normal shadow-sm"
          disabled={disabled}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-72 min-w-56" align="start">
        {showAllOption ? (
          <DropdownMenuCheckboxItem
            checked={values.length === 0}
            onCheckedChange={() => onValuesChange([])}
            onSelect={(event) => event.preventDefault()}
          >
            {label}: All
          </DropdownMenuCheckboxItem>
        ) : null}
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selectedValueSet.has(option.value)}
            onCheckedChange={() => toggleValue(option.value)}
            onSelect={(event) => event.preventDefault()}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EntityMultiFilterSelect({
  values,
  onValuesChange,
  label,
  items,
  disabled,
}: {
  values: string[];
  onValuesChange: (values: string[]) => void;
  label: string;
  items: { id: string; name: string }[];
  disabled?: boolean;
}) {
  return (
    <MultiFilterSelect
      values={values}
      onValuesChange={onValuesChange}
      label={label}
      options={items.map((item) => ({ value: item.id, label: item.name }))}
      disabled={disabled}
    />
  );
}
