import { useMemo, useState, type ReactNode } from "react";

import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { ChevronDown, FileText, Folder, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ViewMode } from "@/hooks/use-persisted-view-mode";
import { cn } from "@/lib/utils";
import type {
  IssueListItem,
  ProjectComponentListItem,
  ProjectIssuesListResponse,
  ProjectModuleListItem,
} from "@/routes/issues/types";
import type {
  IssueClaimMember,
  IssueClaimRole,
} from "@/components/issues/shared/issue-claim";

import { EmptyState, getIssueCompletion, ProgressBar } from "../ui";
import { IssueCollectionView } from "./issue-collection-view";

type ModulesViewProps = {
  modules: ProjectModuleListItem[];
  components: ProjectComponentListItem[];
  moduleCounts: ProjectIssuesListResponse["moduleCounts"];
  componentCounts: ProjectIssuesListResponse["componentCounts"];
  issues: IssueListItem[];
  canEdit: boolean;
  onOpenIssue: (issue: IssueListItem) => void;
  onCreateModule: () => void;
  onCreateComponent: (moduleId: string) => void;
  activeModuleFilters: string[];
  activeComponentFilters: string[];
  onApplyModuleFilter: (moduleId: string) => void;
  onApplyComponentFilter: (component: ProjectComponentListItem) => void;
  viewMode: ViewMode;
  setViewMode: (viewMode: ViewMode) => void;
  isLoading: boolean;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  onPageIndexChange: (index: number) => void;
  onPageSizeChange: (size: number) => void;
  onEditIssue: (issue: IssueListItem) => void;
  onDeleteIssue: (issue: IssueListItem) => void;
  onExport: () => void;
  onDownloadTemplate: () => void;
  onImportExcel: (file: File) => void;
  isExporting: boolean;
  isImportingExcel: boolean;
  totalIssueCount: number;
  selectedIssueIds: string[];
  onSelectedIssueIdsChange: (issueIds: string[]) => void;
  bulkActionBar?: ReactNode;
  currentMember?: IssueClaimMember | null;
  onClaimIssue?: (issue: IssueListItem, role: IssueClaimRole) => void;
  claimActionPending?: boolean;
};

export function ModulesView({
  modules,
  components,
  moduleCounts,
  componentCounts,
  issues,
  canEdit,
  onOpenIssue,
  onCreateModule,
  onCreateComponent,
  activeModuleFilters,
  activeComponentFilters,
  onApplyModuleFilter,
  onApplyComponentFilter,
  ...issueViewProps
}: ModulesViewProps) {
  const [openModuleIds, setOpenModuleIds] = useState<Record<string, boolean>>(
    {},
  );
  const hasActiveModuleScope =
    activeModuleFilters.length > 0 || activeComponentFilters.length > 0;
  const activeScopeTitle = getActiveScopeTitle(
    modules,
    components,
    activeModuleFilters,
    activeComponentFilters,
  );
  const moduleById = useMemo(
    () => new Map(modules.map((moduleItem) => [moduleItem.id, moduleItem])),
    [modules],
  );
  const rootModules = useMemo(
    () =>
      modules.filter(
        (moduleItem) =>
          !moduleItem.parentModuleId ||
          !moduleById.has(moduleItem.parentModuleId),
      ),
    [moduleById, modules],
  );
  const modulesByParent = useMemo(() => {
    const groupedModules = new Map<string, ProjectModuleListItem[]>();

    for (const moduleItem of modules) {
      if (
        !moduleItem.parentModuleId ||
        !moduleById.has(moduleItem.parentModuleId)
      ) {
        continue;
      }

      const siblings = groupedModules.get(moduleItem.parentModuleId) ?? [];
      siblings.push(moduleItem);
      groupedModules.set(moduleItem.parentModuleId, siblings);
    }

    return groupedModules;
  }, [moduleById, modules]);
  const componentsByModule = useMemo(() => {
    const groupedComponents = new Map<string, ProjectComponentListItem[]>();

    for (const component of components) {
      const moduleComponents = groupedComponents.get(component.moduleId) ?? [];
      moduleComponents.push(component);
      groupedComponents.set(component.moduleId, moduleComponents);
    }

    return groupedComponents;
  }, [components]);

  function isModuleOpen(moduleId: string, fallbackOpen = false) {
    return openModuleIds[moduleId] ?? fallbackOpen;
  }

  function toggleModule(moduleId: string, fallbackOpen = false) {
    setOpenModuleIds((currentOpenIds) => ({
      ...currentOpenIds,
      [moduleId]: !(currentOpenIds[moduleId] ?? fallbackOpen),
    }));
  }

  if (modules.length === 0) {
    return (
      <section className="space-y-4">
        <ModulesHeader canEdit={canEdit} onCreateModule={onCreateModule} />
        <EmptyState
          title="No modules yet"
          description="Create parent modules, then add child modules or components under them."
        />
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <ModulesHeader canEdit={canEdit} onCreateModule={onCreateModule} />

      <div className="grid gap-4 xl:grid-cols-3">
        {rootModules.map((moduleItem, index) => (
          <ModulePanel
            key={moduleItem.id}
            moduleItem={moduleItem}
            moduleCounts={moduleCounts}
            componentCounts={componentCounts}
            modulesByParent={modulesByParent}
            componentsByModule={componentsByModule}
            canEdit={canEdit}
            activeModuleFilters={activeModuleFilters}
            activeComponentFilters={activeComponentFilters}
            openModuleIds={openModuleIds}
            defaultOpen={index === 0}
            onToggleModule={toggleModule}
            onCreateComponent={onCreateComponent}
            onApplyModuleFilter={onApplyModuleFilter}
            onApplyComponentFilter={onApplyComponentFilter}
            isModuleOpen={isModuleOpen}
          />
        ))}
      </div>

      {hasActiveModuleScope ? (
        <IssueCollectionView
          title={activeScopeTitle}
          description="Issues matching the selected module scope."
          issues={issues}
          canEdit={canEdit}
          onOpenIssue={onOpenIssue}
          {...issueViewProps}
        />
      ) : null}
    </div>
  );
}

function ModulesHeader({
  canEdit,
  onCreateModule,
}: {
  canEdit: boolean;
  onCreateModule: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">Modules</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Product areas as folders, with submodules and component files nested
          underneath.
        </p>
      </div>
      {canEdit ? (
        <Button
          type="button"
          onClick={onCreateModule}
          className="w-full sm:w-fit"
        >
          <Plus className="h-4 w-4" />
          Module
        </Button>
      ) : null}
    </div>
  );
}

function ModulePanel({
  moduleItem,
  moduleCounts,
  componentCounts,
  modulesByParent,
  componentsByModule,
  canEdit,
  activeModuleFilters,
  activeComponentFilters,
  defaultOpen,
  onToggleModule,
  onCreateComponent,
  onApplyModuleFilter,
  onApplyComponentFilter,
  isModuleOpen,
}: {
  moduleItem: ProjectModuleListItem;
  moduleCounts: ProjectIssuesListResponse["moduleCounts"];
  componentCounts: ProjectIssuesListResponse["componentCounts"];
  modulesByParent: Map<string, ProjectModuleListItem[]>;
  componentsByModule: Map<string, ProjectComponentListItem[]>;
  canEdit: boolean;
  activeModuleFilters: string[];
  activeComponentFilters: string[];
  openModuleIds: Record<string, boolean>;
  defaultOpen?: boolean;
  onToggleModule: (moduleId: string, fallbackOpen?: boolean) => void;
  onCreateComponent: (moduleId: string) => void;
  onApplyModuleFilter: (moduleId: string) => void;
  onApplyComponentFilter: (component: ProjectComponentListItem) => void;
  isModuleOpen: (moduleId: string, fallbackOpen?: boolean) => boolean;
}) {
  const childModules = modulesByParent.get(moduleItem.id) ?? [];
  const moduleComponents = componentsByModule.get(moduleItem.id) ?? [];
  const hasChildren = childModules.length > 0 || moduleComponents.length > 0;
  const isOpen = isModuleOpen(moduleItem.id, defaultOpen);
  const count = moduleCounts.find((item) => item.id === moduleItem.id);
  const progress = getIssueCompletion(
    count?.issueCount ?? 0,
    count?.doneCount ?? 0,
  );
  const isActive =
    activeModuleFilters.includes(moduleItem.id) &&
    activeComponentFilters.length === 0;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card shadow-sm",
        isActive ? "border-emerald-500/50" : "border-border/70",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/70 to-cyan-400/70" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => onApplyModuleFilter(moduleItem.id)}
            className={cn(
              "flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left transition-colors hover:text-emerald-700 dark:hover:text-emerald-300",
              isActive && "text-emerald-700 dark:text-emerald-300",
            )}
          >
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <Folder className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="line-clamp-2 break-words font-semibold">
                {moduleItem.name}
              </h2>
              <p className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">
                {moduleItem.description ?? "No description."}
              </p>
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline">{count?.issueCount ?? 0} issues</Badge>
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => onCreateComponent(moduleItem.id)}
                aria-label={`Add component to ${moduleItem.name}`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Component</span>
              </Button>
            ) : null}
            {hasChildren ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onToggleModule(moduleItem.id, defaultOpen)}
                aria-label={`${isOpen ? "Collapse" : "Expand"} ${moduleItem.name}`}
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
            <span>Completion</span>
            <span>{progress}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>
      </div>

      {hasChildren && isOpen ? (
        <div className="border-t border-border/70">
          {childModules.map((childModule) => (
            <ModuleTreeNode
              key={childModule.id}
              moduleItem={childModule}
              depth={1}
              moduleCounts={moduleCounts}
              componentCounts={componentCounts}
              modulesByParent={modulesByParent}
              componentsByModule={componentsByModule}
              canEdit={canEdit}
              activeModuleFilters={activeModuleFilters}
              activeComponentFilters={activeComponentFilters}
              onToggleModule={onToggleModule}
              onCreateComponent={onCreateComponent}
              onApplyModuleFilter={onApplyModuleFilter}
              onApplyComponentFilter={onApplyComponentFilter}
              isModuleOpen={isModuleOpen}
            />
          ))}

          {moduleComponents.map((component) => (
            <ComponentRow
              key={component.id}
              component={component}
              count={
                componentCounts.find((item) => item.id === component.id)
                  ?.issueCount ?? 0
              }
              depth={1}
              active={activeComponentFilters.includes(component.id)}
              onApplyComponentFilter={onApplyComponentFilter}
            />
          ))}

          {childModules.length === 0 &&
          moduleComponents.length === 0 &&
          !canEdit ? (
            <div className="px-4 py-5 text-sm text-muted-foreground">
              Nothing inside this module yet.
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ModuleTreeNode({
  moduleItem,
  depth,
  moduleCounts,
  componentCounts,
  modulesByParent,
  componentsByModule,
  canEdit,
  activeModuleFilters,
  activeComponentFilters,
  onToggleModule,
  onCreateComponent,
  onApplyModuleFilter,
  onApplyComponentFilter,
  isModuleOpen,
}: {
  moduleItem: ProjectModuleListItem;
  depth: number;
  moduleCounts: ProjectIssuesListResponse["moduleCounts"];
  componentCounts: ProjectIssuesListResponse["componentCounts"];
  modulesByParent: Map<string, ProjectModuleListItem[]>;
  componentsByModule: Map<string, ProjectComponentListItem[]>;
  canEdit: boolean;
  activeModuleFilters: string[];
  activeComponentFilters: string[];
  onToggleModule: (moduleId: string, fallbackOpen?: boolean) => void;
  onCreateComponent: (moduleId: string) => void;
  onApplyModuleFilter: (moduleId: string) => void;
  onApplyComponentFilter: (component: ProjectComponentListItem) => void;
  isModuleOpen: (moduleId: string, fallbackOpen?: boolean) => boolean;
}) {
  const childModules = modulesByParent.get(moduleItem.id) ?? [];
  const moduleComponents = componentsByModule.get(moduleItem.id) ?? [];
  const isOpen = isModuleOpen(moduleItem.id, false);
  const count =
    moduleCounts.find((item) => item.id === moduleItem.id)?.issueCount ?? 0;
  const hasChildren = childModules.length > 0 || moduleComponents.length > 0;
  const isActive =
    activeModuleFilters.includes(moduleItem.id) &&
    activeComponentFilters.length === 0;

  return (
    <div>
      <div
        className={cn(
          "flex w-full min-w-0 items-center gap-2 border-b border-border/60 px-4 py-3 hover:bg-muted/30",
          isActive && "bg-emerald-500/10",
        )}
        style={{ paddingLeft: `${1 + depth * 1.25}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            onClick={() => onToggleModule(moduleItem.id)}
            aria-label={`${isOpen ? "Collapse" : "Expand"} ${moduleItem.name}`}
            aria-expanded={isOpen}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isOpen && "rotate-180",
              )}
            />
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" />
        )}
        <button
          type="button"
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:text-emerald-700 dark:hover:text-emerald-300",
            isActive && "text-emerald-700 dark:text-emerald-300",
          )}
          onClick={() => onApplyModuleFilter(moduleItem.id)}
        >
          <Folder className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-300" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {moduleItem.name}
          </span>
        </button>
        <Badge variant="secondary" className="shrink-0">
          {count}
        </Badge>
        {canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => onCreateComponent(moduleItem.id)}
            aria-label={`Add component to ${moduleItem.name}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      {isOpen ? (
        <div>
          {childModules.map((childModule) => (
            <ModuleTreeNode
              key={childModule.id}
              moduleItem={childModule}
              depth={depth + 1}
              moduleCounts={moduleCounts}
              componentCounts={componentCounts}
              modulesByParent={modulesByParent}
              componentsByModule={componentsByModule}
              canEdit={canEdit}
              activeModuleFilters={activeModuleFilters}
              activeComponentFilters={activeComponentFilters}
              onToggleModule={onToggleModule}
              onCreateComponent={onCreateComponent}
              onApplyModuleFilter={onApplyModuleFilter}
              onApplyComponentFilter={onApplyComponentFilter}
              isModuleOpen={isModuleOpen}
            />
          ))}
          {moduleComponents.map((component) => (
            <ComponentRow
              key={component.id}
              component={component}
              count={
                componentCounts.find((item) => item.id === component.id)
                  ?.issueCount ?? 0
              }
              depth={depth + 1}
              active={activeComponentFilters.includes(component.id)}
              onApplyComponentFilter={onApplyComponentFilter}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ComponentRow({
  component,
  count,
  depth,
  active,
  onApplyComponentFilter,
}: {
  component: ProjectComponentListItem;
  count: number;
  depth: number;
  active: boolean;
  onApplyComponentFilter: (component: ProjectComponentListItem) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full min-w-0 items-start gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-muted/30 hover:text-emerald-700 dark:hover:text-emerald-300",
        active && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      )}
      style={{ paddingLeft: `${1 + depth * 1.25}rem` }}
      onClick={() => onApplyComponentFilter(component)}
    >
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="line-clamp-1 break-words text-sm font-medium">
          {component.name}
        </div>
        <p className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground">
          {component.description ?? "No description."}
        </p>
      </div>
      <Badge variant="secondary" className="shrink-0">
        {count}
      </Badge>
    </button>
  );
}

function getActiveScopeTitle(
  modules: ProjectModuleListItem[],
  components: ProjectComponentListItem[],
  activeModuleFilters: string[],
  activeComponentFilters: string[],
) {
  const activeComponents = components.filter((component) =>
    activeComponentFilters.includes(component.id),
  );

  if (activeComponents.length === 1) {
    return `${activeComponents[0].name} issues`;
  }

  if (activeComponents.length > 1) {
    return `${activeComponents.length} selected components`;
  }

  const activeModule = modules.find((moduleItem) =>
    activeModuleFilters.includes(moduleItem.id),
  );

  return activeModule ? `${activeModule.name} issues` : "Filtered issues";
}
