"use client";

import { useMemo, useState } from "react";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers3,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const subModulesByParentId = useMemo(() => {
    const map = new Map<string, ProjectModuleListItem[]>();

    for (const projectModule of modules) {
      if (!projectModule.parentModuleId) {
        continue;
      }

      const siblings = map.get(projectModule.parentModuleId);

      if (siblings) {
        siblings.push(projectModule);
      } else {
        map.set(projectModule.parentModuleId, [projectModule]);
      }
    }

    return map;
  }, [modules]);

  const [expandedMainModuleIds, setExpandedMainModuleIds] = useState<string[]>([]);
  const [moduleSearchValue, setModuleSearchValue] = useState("");

  const normalizedSearchValue = moduleSearchValue.trim().toLowerCase();
  const selectedCount = selectedModuleFilters.length;
  const sidebarMeta =
    selectedCount > 0 ? `${selectedCount} selected` : `${modules.length + 2} items`;

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

  const visibleMainModules = useMemo(
    () =>
      mainModules
        .map((mainModule) => {
          const subModules = subModulesByParentId.get(mainModule.id) ?? [];

          if (!normalizedSearchValue) {
            return {
              mainModule,
              subModules,
            };
          }

          const mainMatches = mainModule.name.toLowerCase().includes(normalizedSearchValue);
          const matchingSubModules = subModules.filter((subModule) =>
            subModule.name.toLowerCase().includes(normalizedSearchValue)
          );

          if (!mainMatches && matchingSubModules.length === 0) {
            return null;
          }

          return {
            mainModule,
            subModules: mainMatches ? subModules : matchingSubModules,
          };
        })
        .filter(
          (
            value
          ): value is {
            mainModule: ProjectModuleListItem;
            subModules: ProjectModuleListItem[];
          } => value !== null
        ),
    [mainModules, normalizedSearchValue, subModulesByParentId]
  );

  const selectedParentModuleIds = useMemo(
    () =>
      new Set(
        modules
          .filter(
            (projectModule) =>
              Boolean(projectModule.parentModuleId) &&
              selectedModuleFilters.includes(projectModule.id)
          )
          .map((projectModule) => projectModule.parentModuleId)
          .filter((parentModuleId): parentModuleId is string => Boolean(parentModuleId))
      ),
    [modules, selectedModuleFilters]
  );

  function toggleMainModuleExpansion(mainModuleId: string) {
    setExpandedMainModuleIds((currentIds) =>
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

        <div className="flex items-center gap-1">
          {canEditProject && !collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-xl"
                  onClick={onCreateMainModule}
                  aria-label="Create main module"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? "right" : "bottom"}>New module</TooltipContent>
            </Tooltip>
          ) : null}

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
      </div>

      {collapsed ? (
        <div className="flex flex-1 min-h-0 flex-col items-center gap-3 overflow-hidden px-2 py-3">
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
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={moduleSearchValue}
                  onChange={(event) => setModuleSearchValue(event.target.value)}
                  placeholder="Find module"
                  className="h-9 rounded-xl border-border/60 bg-background/70 pl-9 text-sm"
                />
              </div>

              <button
                type="button"
                onClick={onClearSelection}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
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
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
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

              {visibleMainModules.map(({ mainModule, subModules }) => {
                const isMainModuleActive = selectedModuleFilters.includes(mainModule.id);
                const isMainModuleExpanded =
                  normalizedSearchValue.length > 0 ||
                  selectedParentModuleIds.has(mainModule.id) ||
                  expandedMainModuleIds.includes(mainModule.id);

                const hasSubModules = subModules.length > 0;

                return (
                  <div key={mainModule.id} className="space-y-1.5">
                    <div
                      className={cn(
                        "group flex items-center gap-1.5 rounded-xl border px-2.5 py-2 transition-colors hover:bg-accent/60",
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
                        <div className="min-w-0 truncate text-sm font-medium">
                          {mainModule.name}
                        </div>

                        <Badge
                          variant={isMainModuleActive ? "secondary" : "outline"}
                          className="shrink-0"
                        >
                          {moduleIssueCountById.get(mainModule.id) ?? 0}
                        </Badge>
                      </button>

                      <div
                        className={cn(
                          "flex h-8 shrink-0 items-center justify-end overflow-hidden transition-[width] duration-200 ease-out",
                          canEditProject ? "w-8 group-hover:w-[68px] focus-within:w-[68px]" : "w-8"
                        )}
                      >
                        {canEditProject ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="shrink-0 rounded-lg opacity-0 -translate-x-1 scale-95 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100 focus-visible:opacity-100 focus-visible:translate-x-0 focus-visible:scale-100"
                            onClick={() => onCreateSubModule(mainModule.id)}
                            aria-label={`Create sub module under ${mainModule.name}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        ) : null}

                        {hasSubModules ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="shrink-0 rounded-lg"
                            onClick={() => toggleMainModuleExpansion(mainModule.id)}
                            aria-label={
                              isMainModuleExpanded
                                ? `Collapse ${mainModule.name}`
                                : `Expand ${mainModule.name}`
                            }
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform duration-200",
                                isMainModuleExpanded ? "rotate-180" : ""
                              )}
                            />
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {subModules.length > 0 && isMainModuleExpanded ? (
                      <div className="space-y-1 pl-3">
                        {subModules.map((subModule) => {
                          const isSubModuleActive = selectedModuleFilters.includes(subModule.id);

                          return (
                            <button
                              key={subModule.id}
                              type="button"
                              onClick={() => onToggleModule(subModule.id)}
                              className={cn(
                                "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
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

              {visibleMainModules.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-3 py-5 text-center text-xs text-muted-foreground">
                  No modules match your search.
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t border-border/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {selectedCount > 0
                  ? `${selectedCount} module filter${selectedCount === 1 ? "" : "s"} active`
                  : "Multi-select enabled"}
              </div>

              {selectedCount > 0 ? (
                <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}