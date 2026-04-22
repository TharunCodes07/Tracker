"use client";

import { useEffect, useState } from "react";

import {
  AlertTriangle,
  Download,
  Grid2x2,
  List,
  Plus,
  Search,
  Shapes,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";

import { IssueCard } from "@/components/issues/issue-card";
import { IssueDialog } from "@/components/issues/issue-dialog";
import {
  ActiveFilterChip,
  IssuesEmptyState,
  IssuesPaginationControls,
} from "@/components/issues/issue-workspace-parts";
import { useProjectIssuesWorkspace } from "@/components/issues/helpers/use-project-issues-workspace";
import { ModuleNavigationSidebar } from "@/components/issues/module-navigation-sidebar";
import { IssuePageSidebarController } from "@/components/issues/issue-page-sidebar-controller";
import { MultiSelectFilterMenu } from "@/components/issues/multi-select-filter-menu";
import { saveRecentProject } from "@/components/nav/hooks/use-recent-projects";
import { getIssueTableColumns } from "@/components/issues/issue-table-columns";
import { IssueWorkspaceLoading } from "@/components/issues/issues-view-skeleton";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EntityDialog } from "@/components/ui/entity-dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { GridView } from "@/components/ui/grid-view";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ProjectIssuesPage() {
  const workspace = useProjectIssuesWorkspace();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importMainModuleId, setImportMainModuleId] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    if (!workspace.team || !workspace.project) {
      return;
    }

    saveRecentProject({
      teamId: workspace.team.id,
      teamName: workspace.team.name,
      projectId: workspace.project.id,
      projectName: workspace.project.name,
    });
  }, [workspace.project, workspace.team]);

  if (!workspace.hasRequiredParams) {
    return (
      <div className="rounded-[28px] border border-dashed border-border/70 bg-card/70 px-6 py-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400/20 to-cyan-400/20 text-emerald-500">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-foreground">Project not found</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          The route is missing a valid team id or project id.
        </p>
      </div>
    );
  }

  if (workspace.isLoading) {
    return (
      <div className="space-y-4">
        <IssuePageSidebarController />
        <IssueWorkspaceLoading
          viewMode={workspace.viewMode}
          moduleSidebarCollapsed={workspace.isModuleSidebarCollapsed}
        />
      </div>
    );
  }

  if (!workspace.team || !workspace.project) {
    return (
      <div className="space-y-4">
        <IssuePageSidebarController />
        <div className="rounded-[28px] border border-dashed border-border/70 bg-card/70 px-6 py-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400/20 to-cyan-400/20 text-emerald-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-foreground">Could not load project</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {workspace.loadError ?? "The requested project could not be loaded from this workspace."}
          </p>
        </div>
      </div>
    );
  }

  const issueTableColumns = getIssueTableColumns({
    canEdit: workspace.canEditProject,
    onEdit: workspace.openEditIssueDialog,
    onDelete: workspace.setIssueToDelete,
    actionPending: workspace.areIssueActionsPending,
  });

  return (
    <div className="space-y-4">
      <IssuePageSidebarController />

      <section className="rounded-[28px] border border-border/60 bg-card/80 px-5 py-4 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="outline"
                className="border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Project issues
              </Badge>
              <Badge variant="secondary">{workspace.team.name}</Badge>
              <Badge variant={workspace.team.canEdit ? "outline" : "secondary"}>
                {workspace.team.canEdit ? "Edit access" : "Read access"}
              </Badge>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {workspace.project.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
                    {workspace.totalIssues} issues
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
                    {workspace.modules.length} modules
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
                    {workspace.issueClasses.length} types
                  </span>
                </div>
              </div>

              <p className="max-w-2xl text-sm text-muted-foreground">
                {workspace.project.description ??
                  "Filter, sort, and manage issues across the project workspace."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-sm">
                <span className="text-muted-foreground">Open</span>
                <span className="font-semibold text-amber-600 dark:text-amber-300">
                  {workspace.openIssueCount}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-sm">
                <span className="text-muted-foreground">Resolved</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                  {workspace.resolvedIssueCount}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-sm">
                <span className="text-muted-foreground">Awaiting test</span>
                <span className="font-semibold text-cyan-600 dark:text-cyan-300">
                  {workspace.pendingTestIssueCount}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-sm">
                <span className="text-muted-foreground">Critical</span>
                <span className="font-semibold text-rose-600 dark:text-rose-300">
                  {workspace.criticalIssueCount}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExportOpen(true)}
                disabled={workspace.isExportingIssues}
              >
                <Download className="h-4 w-4" />
                {workspace.isExportingIssues ? "Exporting..." : "Export Excel"}
              </Button>
              {workspace.canEditProject ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setImportMainModuleId((currentValue) =>
                        currentValue || workspace.mainModules[0]?.id || ""
                      );
                      setImportFile(null);
                      setIsImportOpen(true);
                    }}
                    disabled={workspace.isImportingIssues}
                  >
                    <Upload className="h-4 w-4" />
                    {workspace.isImportingIssues ? "Importing..." : "Import Excel"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => workspace.openModuleDialog()}
                  >
                    <Plus className="h-4 w-4" />
                    New module
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={workspace.openIssueClassDialog}
                  >
                    <Plus className="h-4 w-4" />
                    New type
                  </Button>
                  <Button
                    type="button"
                    onClick={workspace.openCreateIssueDialog}
                    className="bg-linear-to-r from-emerald-400 to-cyan-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.24)] hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" />
                    New issue
                  </Button>
                </>
              ) : (
                <Badge variant="outline" className="w-fit">
                  Read-only as team member
                </Badge>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <aside
          className={
            workspace.isModuleSidebarCollapsed
              ? "transition-[width] duration-200 lg:w-19 lg:self-stretch"
              : "transition-[width] duration-200 lg:w-[18rem] lg:self-stretch"
          }
        >
          <ModuleNavigationSidebar
            modules={workspace.modules}
            totalIssues={workspace.totalIssues}
            moduleIssueCountById={workspace.moduleIssueCountById}
            selectedModuleFilters={workspace.selectedModuleFilters}
            collapsed={workspace.isModuleSidebarCollapsed}
            canEditProject={workspace.canEditProject}
            onCollapsedChange={workspace.setIsModuleSidebarCollapsed}
            onToggleModule={workspace.handleModuleFilterToggle}
            onClearSelection={workspace.handleClearModuleFilters}
            onCreateMainModule={() => workspace.openModuleDialog()}
            onCreateSubModule={workspace.openModuleDialog}
          />
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <section className="rounded-[28px] border border-border/60 bg-card/80 p-4 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
                <div className="relative 2xl:max-w-xl 2xl:flex-1">
                  <div className="pointer-events-none absolute inset-y-1 left-1 z-10 flex w-8 items-center justify-center rounded-xl bg-background/40 backdrop-blur-sm">
                    <Search className="h-4 w-4 text-foreground/50" />
                  </div>
                  <Input
                    value={workspace.searchValue}
                    onChange={(event) => workspace.handleSearchChange(event.target.value)}
                    placeholder="Search by issue, number, navigation, assignee, or comments"
                    className="h-10 rounded-2xl border-border/60 bg-background/80 pl-10 shadow-sm backdrop-blur"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <MultiSelectFilterMenu
                    label="Types"
                    icon={Shapes}
                    options={workspace.issueTypeFilterOptions}
                    selectedValues={workspace.selectedIssueTypeFilters}
                    onToggle={workspace.handleIssueTypeFilterToggle}
                    onClear={workspace.handleClearIssueTypeFilters}
                  />
                  <MultiSelectFilterMenu
                    label="Priority"
                    icon={AlertTriangle}
                    options={workspace.priorityFilterOptions}
                    selectedValues={workspace.selectedPriorityFilters}
                    onToggle={workspace.handlePriorityFilterToggle}
                    onClear={workspace.handleClearPriorityFilters}
                  />
                  <MultiSelectFilterMenu
                    label="Assignee"
                    icon={UserRound}
                    options={workspace.assigneeFilterOptions}
                    selectedValues={workspace.selectedAssigneeFilters}
                    onToggle={workspace.handleAssigneeFilterToggle}
                    onClear={workspace.handleClearAssigneeFilters}
                  />

                  <div className="inline-flex items-center rounded-2xl border border-border/60 bg-background/80 p-1 shadow-sm backdrop-blur">
                    <Button
                      type="button"
                      variant={workspace.viewMode === "grid" ? "secondary" : "ghost"}
                      className="rounded-xl"
                      onClick={() => workspace.setViewMode("grid")}
                    >
                      <Grid2x2 className="h-4 w-4" />
                      Grid
                    </Button>
                    <Button
                      type="button"
                      variant={workspace.viewMode === "table" ? "secondary" : "ghost"}
                      className="rounded-xl"
                      onClick={() => workspace.setViewMode("table")}
                    >
                      <List className="h-4 w-4" />
                      Table
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="inline-flex w-full items-center rounded-2xl border border-border/60 bg-background/80 p-1 shadow-sm backdrop-blur sm:w-auto">
                  <Button
                    type="button"
                    variant={workspace.resolutionFilter === "all" ? "secondary" : "ghost"}
                    className="flex-1 rounded-xl sm:flex-none"
                    onClick={() => workspace.handleResolutionFilterChange("all")}
                  >
                    All
                    <span className="text-xs text-muted-foreground">{workspace.totalIssues}</span>
                  </Button>
                  <Button
                    type="button"
                    variant={workspace.resolutionFilter === "open" ? "secondary" : "ghost"}
                    className="flex-1 rounded-xl sm:flex-none"
                    onClick={() => workspace.handleResolutionFilterChange("open")}
                  >
                    Open
                    <span className="text-xs text-muted-foreground">
                      {workspace.openIssueCount}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant={workspace.resolutionFilter === "resolved" ? "secondary" : "ghost"}
                    className="flex-1 rounded-xl sm:flex-none"
                    onClick={() => workspace.handleResolutionFilterChange("resolved")}
                  >
                    Resolved
                    <span className="text-xs text-muted-foreground">
                      {workspace.resolvedIssueCount}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant={
                      workspace.resolutionFilter === "resolved_pending_test"
                        ? "secondary"
                        : "ghost"
                    }
                    className="flex-1 rounded-xl sm:flex-none"
                    onClick={() => workspace.handleResolutionFilterChange("resolved_pending_test")}
                  >
                    Awaiting test
                    <span className="text-xs text-muted-foreground">
                      {workspace.pendingTestIssueCount}
                    </span>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {workspace.activeFilterChips.map((filterChip) => (
                    <ActiveFilterChip
                      key={filterChip.key}
                      label={filterChip.label}
                      onRemove={filterChip.onRemove}
                    />
                  ))}

                  {workspace.hasActiveFilters ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={workspace.handleClearFilters}
                    >
                      Clear filters
                    </Button>
                  ) : null}

                  <Badge variant="outline" className="w-fit">
                    {workspace.pagination.totalItems} of {workspace.totalIssues} issues
                  </Badge>
                </div>
              </div>

              {workspace.isRefreshing || workspace.isSearchPending ? (
                <div className="text-xs text-muted-foreground">
                  {workspace.isSearchPending ? "Waiting for search..." : "Updating issues..."}
                </div>
              ) : null}
            </div>
          </section>

          {!workspace.hasVisibleIssues ? (
            <IssuesEmptyState
              hasAnyIssues={workspace.hasAnyIssues}
              canEditProject={workspace.canEditProject}
              onCreateIssue={workspace.openCreateIssueDialog}
              loadError={workspace.loadError}
              onRetry={() => workspace.refreshIssues()}
            />
          ) : workspace.isGridView ? (
            <div className="space-y-4">
              <GridView
                items={workspace.issues}
                getKey={(issue) => issue.id}
                onItemClick={
                  workspace.canEditProject ? workspace.openEditIssueDialog : undefined
                }
                getItemAriaLabel={(issue) => `Edit issue ${issue.title}`}
                renderItem={(issue) => (
                  <IssueCard
                    issue={issue}
                    canEdit={workspace.canEditProject}
                    actionPending={workspace.areIssueActionsPending}
                    onEdit={workspace.openEditIssueDialog}
                    onDelete={workspace.setIssueToDelete}
                  />
                )}
                itemClassName="min-h-[308px] to-emerald-400/[0.03]"
              />

              <IssuesPaginationControls
                pageIndex={workspace.currentPageIndex}
                pageSize={workspace.pageSize}
                pagination={workspace.pagination}
                disabled={workspace.isRefreshing}
                onPageIndexChange={workspace.setPageIndex}
                onPageSizeChange={workspace.handlePageSizeChange}
              />
            </div>
          ) : (
            <section className="rounded-[28px] border border-border/60 bg-card/80 p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Issue table</h2>
                  <p className="text-sm text-muted-foreground">
                    Dense view for scanning owners, types, priority, and resolution state.
                  </p>
                </div>

                <Badge variant="outline" className="w-fit">
                  {workspace.pagination.totalItems}{" "}
                  {workspace.pagination.totalItems === 1 ? "issue" : "issues"}
                </Badge>
              </div>

              <DataTable
                columns={issueTableColumns}
                data={workspace.issues}
                onRowClick={
                  workspace.canEditProject ? workspace.openEditIssueDialog : undefined
                }
                sorting={workspace.sorting}
                onSortingChange={workspace.handleSortingChange}
                pageIndex={workspace.currentPageIndex}
                pageSize={workspace.pageSize}
                pageCount={workspace.pagination.totalPages}
                onPageIndexChange={workspace.setPageIndex}
                onPageSizeChange={workspace.handlePageSizeChange}
              />
            </section>
          )}
        </div>
      </div>

      <EntityDialog
        open={workspace.isModuleOpen}
        onOpenChange={workspace.closeModuleDialog}
        name={workspace.moduleName}
        description={workspace.moduleDescription}
        pending={workspace.isCreatingModule}
        title={workspace.moduleParentId ? "Create Sub Module" : "Create Module"}
        descriptionText={
          workspace.moduleParentId
            ? "Add a sub module under the selected main module so issues can be tracked at a more specific level."
            : "Add a top-level module and optionally create its first sub module in one step."
        }
        submitLabel={
          workspace.moduleParentId
            ? "Create sub module"
            : workspace.createSubModulesWithMain
              ? "Create module set"
              : "Create module"
        }
        nameLabel={workspace.moduleParentId ? "Sub module name" : "Main module name"}
        nameInputId="project-module-name"
        namePlaceholder={workspace.moduleParentId ? "Login form" : "Authentication"}
        descriptionInputId="project-module-description"
        descriptionPlaceholder={
          workspace.moduleParentId
            ? "What this sub module covers within the selected main module."
            : "What part of the project this main module covers."
        }
        descriptionHelpText="Leave the parent blank to create a main module. Choose one to add a sub module beneath it."
        onNameChange={workspace.setModuleName}
        onDescriptionChange={workspace.setModuleDescription}
        onSubmit={workspace.handleCreateModule}
      >
        <Field className="min-w-0">
          <FieldLabel>Parent main module</FieldLabel>
          <Select
            value={workspace.moduleParentId || "__main__"}
            onValueChange={(value) =>
              workspace.setModuleParentId(value === "__main__" ? "" : value)
            }
            disabled={workspace.isCreatingModule}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Create as a main module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__main__">Create as a main module</SelectItem>
              {workspace.mainModules.map((module) => (
                <SelectItem key={module.id} value={module.id}>
                  {module.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            Sub modules inherit their grouping from the selected main module.
          </FieldDescription>
        </Field>

        {!workspace.moduleParentId ? (
          <div className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-3">
            <Field orientation="horizontal" className="items-start gap-3">
              <Checkbox
                id="create-first-sub-module"
                checked={workspace.createSubModulesWithMain}
                onCheckedChange={(checked) => {
                  const shouldCreateSubModules = checked === true;

                  workspace.setCreateSubModulesWithMain(shouldCreateSubModules);

                  if (shouldCreateSubModules && workspace.subModuleDrafts.length === 0) {
                    workspace.addSubModuleDraft();
                  }
                }}
                disabled={workspace.isCreatingModule}
              />
              <div className="space-y-1">
                <FieldLabel htmlFor="create-first-sub-module">Create sub modules now</FieldLabel>
                <FieldDescription>
                  Optional: create one or more sub modules immediately after the main module is
                  created.
                </FieldDescription>
              </div>
            </Field>

            {workspace.createSubModulesWithMain ? (
              <>
                {workspace.subModuleDrafts.map((subModuleDraft, index) => (
                  <div
                    key={`sub-module-draft-${index}`}
                    className="space-y-3 rounded-xl border border-border/60 bg-background/70 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-foreground">Sub module {index + 1}</div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => workspace.removeSubModuleDraft(index)}
                        disabled={workspace.isCreatingModule}
                      >
                        Remove
                      </Button>
                    </div>

                    <Field className="min-w-0">
                      <FieldLabel htmlFor={`project-module-sub-name-${index}`}>
                        Sub module name
                      </FieldLabel>
                      <Input
                        id={`project-module-sub-name-${index}`}
                        value={subModuleDraft.name}
                        onChange={(event) =>
                          workspace.updateSubModuleDraft(index, { name: event.target.value })
                        }
                        placeholder="Login form"
                        autoComplete="off"
                        disabled={workspace.isCreatingModule}
                        required={workspace.createSubModulesWithMain}
                      />
                    </Field>

                    <Field className="min-w-0">
                      <FieldLabel htmlFor={`project-module-sub-description-${index}`}>
                        Sub module description
                      </FieldLabel>
                      <Input
                        id={`project-module-sub-description-${index}`}
                        value={subModuleDraft.description}
                        onChange={(event) =>
                          workspace.updateSubModuleDraft(index, {
                            description: event.target.value,
                          })
                        }
                        placeholder="Optional details for this sub module"
                        autoComplete="off"
                        disabled={workspace.isCreatingModule}
                      />
                    </Field>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={workspace.addSubModuleDraft}
                  disabled={workspace.isCreatingModule}
                >
                  <Plus className="h-4 w-4" />
                  Add another sub module
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </EntityDialog>

      <EntityDialog
        open={workspace.isIssueClassOpen}
        onOpenChange={workspace.closeIssueClassDialog}
        name={workspace.issueClassName}
        description={workspace.issueClassDescription}
        pending={workspace.isCreatingIssueClass}
        title="Create Issue Type"
        descriptionText="Add another issue type for this project. The default Bug and UI types remain available."
        submitLabel="Create type"
        nameLabel="Issue type name"
        nameInputId="issue-class-name"
        namePlaceholder="Auth"
        descriptionInputId="issue-class-description"
        descriptionPlaceholder="When this type should be used."
        descriptionHelpText="Use short labels so the issue workspace stays easy to scan."
        onNameChange={workspace.setIssueClassName}
        onDescriptionChange={workspace.setIssueClassDescription}
        onSubmit={workspace.handleCreateIssueClass}
      />

      <IssueDialog
        open={workspace.isIssueOpen}
        onOpenChange={workspace.closeIssueDialog}
        pending={workspace.isIssueMutationPending}
        values={workspace.issueForm}
        modules={workspace.modules}
        issueClasses={workspace.issueClasses}
        members={workspace.members}
        onChange={workspace.handleIssueFormChange}
        onSubmit={workspace.isEditingIssue ? workspace.handleUpdateIssue : workspace.handleCreateIssue}
        title={workspace.isEditingIssue ? "Edit Issue" : "Create Issue"}
        descriptionText={
          workspace.isEditingIssue
            ? "Update the issue details, ownership, and resolution state."
            : "Add a general issue or tie it to a project module, then assign the right teammates for build, review, and testing."
        }
        submitLabel={workspace.isEditingIssue ? "Save changes" : "Create issue"}
        className="max-"
      />

      <AlertDialog
        open={Boolean(workspace.issueToDelete)}
        onOpenChange={(open) => !open && workspace.setIssueToDelete(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete issue</AlertDialogTitle>
            <AlertDialogDescription>
              {workspace.issueToDelete
                ? `Delete #${workspace.issueToDelete.no} ${workspace.issueToDelete.title}? This action cannot be undone.`
                : "Delete this issue?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={workspace.isDeletingIssue}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={workspace.isDeletingIssue}
              onClick={workspace.handleDeleteIssue}
            >
              {workspace.isDeletingIssue ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isExportOpen}
        onOpenChange={(open) => {
          if (!workspace.isExportingIssues) {
            setIsExportOpen(open);
          }
        }}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-xl">
          <DialogHeader className="min-w-0 pr-8">
            <DialogTitle>Export issues</DialogTitle>
            <DialogDescription>
              Export the current filtered view as one workbook, or export everything as one workbook
              per main module with a sheet for the main module issues and each sub module.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <button
              type="button"
              className="rounded-3xl border border-border/60 bg-background/70 px-4 py-4 text-left transition-colors hover:bg-accent"
              onClick={() => {
                workspace.handleExportIssuesToExcel("current");
                setIsExportOpen(false);
              }}
              disabled={workspace.isExportingIssues}
            >
              <div className="text-sm font-semibold text-foreground">Current view workbook</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Exports the filtered issues you are looking at right now into a single Excel file.
              </div>
            </button>

            <button
              type="button"
              className="rounded-3xl border border-border/60 bg-background/70 px-4 py-4 text-left transition-colors hover:bg-accent"
              onClick={() => {
                workspace.handleExportIssuesToExcel("bundle");
                setIsExportOpen(false);
              }}
              disabled={workspace.isExportingIssues}
            >
              <div className="text-sm font-semibold text-foreground">Everything by main module</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Downloads a zip with one workbook per main module. Each workbook contains a
                dedicated Main Module sheet plus one sheet per sub module. General issues are
                included in a separate workbook.
              </div>
            </button>
          </div>

          <DialogFooter className="w-full flex-wrap">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setIsExportOpen(false)}
              disabled={workspace.isExportingIssues}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isImportOpen}
        onOpenChange={(open) => {
          setIsImportOpen(open);

          if (!open) {
            setImportFile(null);
          }
        }}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-lg">
          <DialogHeader className="min-w-0 pr-8">
            <DialogTitle>Import issues from Excel</DialogTitle>
            <DialogDescription>
              Choose the main module first. Sheets named Main Module import direct main-module
              issues, while every other sheet is imported as a sub module under it.
            </DialogDescription>
          </DialogHeader>

          <form
            className="min-w-0"
            onSubmit={(event) => {
              event.preventDefault();

              if (!importFile || !importMainModuleId) {
                return;
              }

              workspace.handleImportIssuesFromFile(importFile, importMainModuleId);
              setIsImportOpen(false);
              setImportFile(null);
            }}
          >
            <FieldGroup>
              <Field className="min-w-0">
                <FieldLabel>Main module</FieldLabel>
                <Select
                  value={importMainModuleId || "__none__"}
                  onValueChange={(value) =>
                    setImportMainModuleId(value === "__none__" ? "" : value)
                  }
                  disabled={workspace.isImportingIssues || workspace.mainModules.length === 0}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Choose a main module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled>
                      Choose a main module
                    </SelectItem>
                    {workspace.mainModules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {workspace.mainModules.length === 0
                    ? "Create a main module before importing sheets as sub modules."
                    : "Use Main Module for direct module issues. Every other sheet name becomes a sub module under the selected main module."}
                </FieldDescription>
              </Field>

              <Field className="min-w-0">
                <FieldLabel htmlFor="issues-import-file">Excel file</FieldLabel>
                <Input
                  id="issues-import-file"
                  type="file"
                  accept=".xlsx,.xlsm"
                  disabled={workspace.isImportingIssues}
                  onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                />
                <FieldDescription>
                  Use one sheet per sub module, or add a Main Module sheet for direct module issues.
                  Existing issue numbers are matched within their own module scope.
                </FieldDescription>
              </Field>

              <DialogFooter className="w-full flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setIsImportOpen(false);
                    setImportFile(null);
                  }}
                  disabled={workspace.isImportingIssues}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full bg-linear-to-r from-emerald-400 to-cyan-400 text-black shadow-[0_0_18px_rgba(16,185,129,0.25)] hover:opacity-90 sm:w-auto"
                  disabled={
                    workspace.isImportingIssues ||
                    !importFile ||
                    !importMainModuleId ||
                    workspace.mainModules.length === 0
                  }
                >
                  {workspace.isImportingIssues ? "Importing..." : "Start import"}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
