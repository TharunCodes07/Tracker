"use client";

import { useMemo, useState } from "react";

import { ChevronDown, ChevronLeft, ChevronRight, Layers3, Plus, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { GENERAL_MODULE_FILTER_VALUE, type ProjectModuleListItem } from "@/routes/issues/types";

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
  onCreateMainModule: () => void;
  onCreateSubModule: (parentModuleId: string) => void;
}

function getModuleMonogram(label: string) {
  const words = label.trim().split(/[^A-Za-z0-9]+/).filter(Boolean);

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
  onCreateMainModule,
  onCreateSubModule,
}: ModuleNavigationSidebarProps) {
  const mainModules = useMemo(
    () => modules.filter((projectModule) => projectModule.parentModuleId === null),
    [modules]
  );
  const subModulesByParentId = new Map<string, ProjectModuleListItem[]>();
  const [collapsedMainModuleIds, setCollapsedMainModuleIds] = useState<string[]>([]);

  for (const projectModule of modules) {
    if (!projectModule.parentModuleId) {
      continue;
    }

    const siblings = subModulesByParentId.get(projectModule.parentModuleId);

    if (siblings) {
      siblings.push(projectModule);
    } else {
      subModulesByParentId.set(projectModule.parentModuleId, [projectModule]);
    }
  }

  const collapsedModuleItems = [
    {
      value: GENERAL_MODULE_FILTER_VALUE,
      label: "General",
      count: moduleIssueCountById.get(GENERAL_MODULE_FILTER_VALUE) ?? 0,
    },
    ...modules.map((projectModule) => ({
      value: projectModule.id,
      label: projectModule.displayName,
      count: moduleIssueCountById.get(projectModule.id) ?? 0,
    })),
  ];

  const selectedCount = selectedModuleFilters.length;
  const sidebarMeta =
    selectedCount > 0 ? `${selectedCount} selected` : `${modules.length + 2} items`;

  function toggleMainModuleExpansion(mainModuleId: string) {
    setCollapsedMainModuleIds((currentIds) =>
      currentIds.includes(mainModuleId)
        ? currentIds.filter((id) => id !== mainModuleId)
        : [...currentIds, mainModuleId]
    );
  }

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

            {collapsedModuleItems.map((item) => {
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
                  onClick={onCreateMainModule}
                  aria-label="Create main module"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New main module</TooltipContent>
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

              <button
                type="button"
                onClick={() => onToggleModule(GENERAL_MODULE_FILTER_VALUE)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                  selectedModuleFilters.includes(GENERAL_MODULE_FILTER_VALUE)
                    ? "border-cyan-400/35 bg-cyan-400/12 text-foreground"
                    : "border-border/60 bg-background/55 text-foreground hover:bg-accent"
                )}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">General</div>
                  <div className="text-xs text-muted-foreground">
                    Issues not tied to any module
                  </div>
                </div>
                <Badge
                  variant={
                    selectedModuleFilters.includes(GENERAL_MODULE_FILTER_VALUE)
                      ? "secondary"
                      : "outline"
                  }
                >
                  {moduleIssueCountById.get(GENERAL_MODULE_FILTER_VALUE) ?? 0}
                </Badge>
              </button>

              {mainModules.map((mainModule) => {
                const isMainModuleActive = selectedModuleFilters.includes(mainModule.id);
                const subModules = subModulesByParentId.get(mainModule.id) ?? [];
                const isMainModuleExpanded = !collapsedMainModuleIds.includes(mainModule.id);

                return (
                  <div key={mainModule.id} className="space-y-1">
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-2xl border px-3 py-2.5 transition-colors",
                        isMainModuleActive
                          ? "border-cyan-400/35 bg-cyan-400/12 text-foreground"
                          : "border-border/60 bg-background/55 text-foreground"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleModule(mainModule.id)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                      >
                        <div className="min-w-0 truncate text-sm font-medium">{mainModule.name}</div>
                        <Badge variant={isMainModuleActive ? "secondary" : "outline"}>
                          {moduleIssueCountById.get(mainModule.id) ?? 0}
                        </Badge>
                      </button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-xl"
                        onClick={() => toggleMainModuleExpansion(mainModule.id)}
                        aria-label={
                          isMainModuleExpanded
                            ? `Collapse ${mainModule.name}`
                            : `Expand ${mainModule.name}`
                        }
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            isMainModuleExpanded ? "rotate-180" : ""
                          )}
                        />
                      </Button>

                      {canEditProject ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-xl"
                          onClick={() => onCreateSubModule(mainModule.id)}
                          aria-label={`Create sub module under ${mainModule.name}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>

                    {subModules.length > 0 && isMainModuleExpanded ? (
                      <div className="space-y-1 pl-4">
                        {subModules.map((subModule) => {
                          const isSubModuleActive = selectedModuleFilters.includes(subModule.id);

                          return (
                            <button
                              key={subModule.id}
                              type="button"
                              onClick={() => onToggleModule(subModule.id)}
                              className={cn(
                                "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                                isSubModuleActive
                                  ? "border-cyan-400/35 bg-cyan-400/12 text-foreground"
                                  : "border-border/60 bg-background/55 text-foreground hover:bg-accent"
                              )}
                            >
                              <div className="min-w-0 truncate text-sm text-muted-foreground">
                                {subModule.name}
                              </div>
                              <Badge variant={isSubModuleActive ? "secondary" : "outline"}>
                                {moduleIssueCountById.get(subModule.id) ?? 0}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
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
                  onClick={onCreateMainModule}
                  className="bg-linear-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  New main module
                </Button>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
