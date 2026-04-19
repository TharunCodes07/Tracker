"use client";

import { ChevronLeft, ChevronRight, Layers3, Plus, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  GENERAL_MODULE_FILTER_VALUE,
  type ProjectModuleListItem,
} from "@/routes/issues/types";

interface ModuleNavigationSidebarProps {
  modules: ProjectModuleListItem[];
  totalIssues: number;
  moduleIssueCountById: ReadonlyMap<string, number>;
  selectedModuleFilters: string[];
  collapsed: boolean;
  canEditProject: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onToggleModule: (value: string) => void;
  onClearSelection: () => void;
  onCreateModule: () => void;
}

function getModuleMonogram(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export function ModuleNavigationSidebar({
  modules,
  totalIssues,
  moduleIssueCountById,
  selectedModuleFilters,
  collapsed,
  canEditProject,
  onCollapsedChange,
  onToggleModule,
  onClearSelection,
  onCreateModule,
}: ModuleNavigationSidebarProps) {
  const moduleItems = [
    {
      value: GENERAL_MODULE_FILTER_VALUE,
      label: "General",
      count: moduleIssueCountById.get(GENERAL_MODULE_FILTER_VALUE) ?? 0,
    },
    ...modules.map((module) => ({
      value: module.id,
      label: module.name,
      count: moduleIssueCountById.get(module.id) ?? 0,
    })),
  ];

  const selectedCount = selectedModuleFilters.length;
  const sidebarMeta =
    selectedCount > 0 ? `${selectedCount} selected` : `${moduleItems.length} items`;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-border/60 bg-card/80 shadow-sm">
      <div
        className={cn(
          "flex items-center border-b border-border/60",
          collapsed ? "justify-between px-2 py-3" : "justify-between px-4 py-4"
        )}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background/70 text-foreground">
                <Layers3 className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Modules</TooltipContent>
          </Tooltip>
        ) : (
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Layers3 className="h-4 w-4 text-cyan-500" />
              Modules
            </div>
            <div className="text-xs text-muted-foreground">{sidebarMeta}</div>
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-xl"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? "Expand modules sidebar" : "Collapse modules sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {collapsed ? (
        <div className="flex flex-1 min-h-0 flex-col items-center justify-between gap-3 overflow-hidden px-2 py-3">
          <div className="flex w-full flex-1 min-h-0 flex-col items-center gap-2 overflow-y-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onClearSelection}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl border text-xs font-semibold transition-colors",
                    selectedCount === 0
                      ? "border-emerald-400/35 bg-emerald-400/12 text-emerald-700 dark:text-emerald-300"
                      : "border-border/60 bg-background/70 text-muted-foreground hover:bg-accent"
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                All modules - {totalIssues} {totalIssues === 1 ? "issue" : "issues"}
              </TooltipContent>
            </Tooltip>

            {moduleItems.map((item) => {
              const isActive = selectedModuleFilters.includes(item.value);

              return (
                <Tooltip key={item.value}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onToggleModule(item.value)}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-2xl border text-[11px] font-semibold uppercase transition-colors",
                        isActive
                          ? "border-cyan-400/35 bg-cyan-400/12 text-cyan-700 dark:text-cyan-300"
                          : "border-border/60 bg-background/70 text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {getModuleMonogram(item.label)}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label} - {item.count} {item.count === 1 ? "issue" : "issues"}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {canEditProject ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  className="rounded-2xl bg-linear-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90"
                  onClick={onCreateModule}
                  aria-label="Create module"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New module</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={onClearSelection}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                  selectedCount === 0
                    ? "border-emerald-400/35 bg-emerald-400/12 text-foreground"
                    : "border-border/60 bg-background/55 text-foreground hover:bg-accent"
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    All modules
                  </div>
                </div>
                <Badge variant="outline">{totalIssues}</Badge>
              </button>

              {moduleItems.map((item) => {
                const isActive = selectedModuleFilters.includes(item.value);

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onToggleModule(item.value)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                      isActive
                        ? "border-cyan-400/35 bg-cyan-400/12 text-foreground"
                        : "border-border/60 bg-background/55 text-foreground hover:bg-accent"
                    )}
                  >
                    <div className="min-w-0 truncate text-sm font-medium">{item.label}</div>
                    <Badge variant={isActive ? "secondary" : "outline"}>{item.count}</Badge>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border/60 p-3">
            <div className="flex items-center justify-between gap-3">
              {selectedCount > 0 ? (
                <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
                  Clear filters
                </Button>
              ) : (
                <div className="text-xs text-muted-foreground">Multi-select enabled</div>
              )}

              {canEditProject ? (
                <Button
                  type="button"
                  onClick={onCreateModule}
                  className="bg-linear-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  New module
                </Button>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
