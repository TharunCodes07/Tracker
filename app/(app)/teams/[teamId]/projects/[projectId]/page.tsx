"use client";

import { useEffect, useState } from "react";

import {
  AlertTriangle,
  Download,
  MoreHorizontal,
  Plus,
  Upload,
} from "lucide-react";

import { IssueCardView } from "@/components/issues/issue-card-view";
import {
  IssueFilters,
  IssueResolutionFilterControl,
} from "@/components/issues/issue-filters";
import { IssueDialog } from "@/components/issues/issue-dialog";
import { IssueExcelTable } from "@/components/issues/excel/issue-excel-table";
import { useProjectIssuesWorkspace } from "@/components/issues/helpers/use-project-issues-workspace";
import { ModuleNavigationSidebar } from "@/components/issues/module-navigation-sidebar";
import { IssuePageSidebarController } from "@/components/issues/issue-page-sidebar-controller";
import { ProjectModuleDialog } from "@/components/issues/project-module-dialog";
import { saveRecentProject } from "@/components/nav/hooks/use-recent-projects";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EntityDialog } from "@/components/ui/entity-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePersistedViewMode } from "@/hooks/use-persisted-view-mode";

const ISSUES_VIEW_STORAGE_KEY = "tracker:project-issues:view-mode";

export default function ProjectIssuesPage() {
  const workspace = useProjectIssuesWorkspace();
  const { viewMode, setViewMode } = usePersistedViewMode(ISSUES_VIEW_STORAGE_KEY, "table");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importMainModuleId, setImportMainModuleId] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const isCardView = viewMode === "grid";

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
      <div className="space-y-3">
        <IssuePageSidebarController />
        <IssueWorkspaceLoading
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

  const resolutionFilterControls = (
    <IssueResolutionFilterControl
      resolutionFilter={workspace.resolutionFilter}
      onResolutionFilterChange={workspace.handleResolutionFilterChange}
      totalIssues={workspace.totalIssues}
      openIssueCount={workspace.openIssueCount}
      resolvedIssueCount={workspace.resolvedIssueCount}
      pendingTestIssueCount={workspace.pendingTestIssueCount}
      reopenedIssueCount={workspace.reopenedIssueCount}
      showViewModeToggle
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    />
  );

  return (
    <div className="space-y-3">
      <IssuePageSidebarController />

      <section className="rounded-xl border border-border/60 bg-card/80 p-3 shadow-sm">
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-start">
          <div className="min-w-0 2xl:w-72 2xl:shrink-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                {workspace.project.name}
              </h1>
              <Badge
                variant={workspace.team.canEdit ? "outline" : "secondary"}
                className="shrink-0"
              >
                {workspace.team.canEdit ? "Edit" : "Read-only"}
              </Badge>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {workspace.team.name}
              {workspace.project.description ? ` - ${workspace.project.description}` : ""}
            </p>
          </div>

          <IssueFilters
            variant="toolbar"
            className="2xl:flex-nowrap"
            searchValue={workspace.searchValue}
            onSearchChange={workspace.handleSearchChange}
            issueTypeFilterOptions={workspace.issueTypeFilterOptions}
            selectedIssueTypeFilters={workspace.selectedIssueTypeFilters}
            onIssueTypeFilterToggle={workspace.handleIssueTypeFilterToggle}
            onClearIssueTypeFilters={workspace.handleClearIssueTypeFilters}
            priorityFilterOptions={workspace.priorityFilterOptions}
            selectedPriorityFilters={workspace.selectedPriorityFilters}
            onPriorityFilterToggle={workspace.handlePriorityFilterToggle}
            onClearPriorityFilters={workspace.handleClearPriorityFilters}
            assigneeFilterOptions={workspace.assigneeFilterOptions}
            selectedAssigneeFilters={workspace.selectedAssigneeFilters}
            onAssigneeFilterToggle={workspace.handleAssigneeFilterToggle}
            onClearAssigneeFilters={workspace.handleClearAssigneeFilters}
            showIssueCount={false}
            showResolutionFilter={false}
            resolutionFilter={workspace.resolutionFilter}
            onResolutionFilterChange={workspace.handleResolutionFilterChange}
            totalIssues={workspace.totalIssues}
            openIssueCount={workspace.openIssueCount}
            resolvedIssueCount={workspace.resolvedIssueCount}
            pendingTestIssueCount={workspace.pendingTestIssueCount}
            reopenedIssueCount={workspace.reopenedIssueCount}
            activeFilterChips={workspace.activeFilterChips}
            hasActiveFilters={workspace.hasActiveFilters}
            onClearFilters={workspace.handleClearFilters}
            visibleIssueCount={workspace.pagination.totalItems}
            isUpdating={workspace.isRefreshing}
            isSearchPending={workspace.isSearchPending}
          />

          <div className="flex shrink-0 flex-wrap items-center gap-2 2xl:justify-end">
            {workspace.canEditProject ? (
              <Button type="button" onClick={workspace.openCreateIssueDialog}>
                <Plus className="h-4 w-4" />
                New issue
              </Button>
            ) : (
              <Badge variant="outline" className="h-8 px-3">
                Read-only
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline">
                  <MoreHorizontal className="h-4 w-4" />
                  Manage
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onSelect={() => setIsExportOpen(true)}
                  disabled={workspace.isExportingIssues}
                >
                  <Download className="h-4 w-4" />
                  {workspace.isExportingIssues ? "Exporting..." : "Export Excel"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={workspace.handleDownloadIssuesExcelTemplate}
                  disabled={workspace.isExportingIssues}
                >
                  <Download className="h-4 w-4" />
                  Download template
                </DropdownMenuItem>

                {workspace.canEditProject ? (
                  <>
                    <DropdownMenuItem
                      onSelect={() => {
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
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => workspace.openModuleDialog()}>
                      <Plus className="h-4 w-4" />
                      New module
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={workspace.openIssueClassDialog}>
                      <Plus className="h-4 w-4" />
                      New Issue type
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 space-y-3">
          <section className="rounded-xl border border-border/60 bg-card/80 p-2 shadow-sm sm:p-3">
            {isCardView ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/25 p-2 shadow-sm">
                  {resolutionFilterControls}
                </div>
                <IssueCardView
                  issues={workspace.issues}
                  totalIssueCount={workspace.pagination.totalItems}
                  pageIndex={workspace.currentPageIndex}
                  pageSize={workspace.pageSize}
                  pageCount={workspace.pagination.totalPages}
                  canEdit={workspace.canEditProject}
                  onIssueClick={
                    workspace.canEditProject ? workspace.openEditIssueDialog : undefined
                  }
                  onPageIndexChange={workspace.setPageIndex}
                  onPageSizeChange={workspace.handlePageSizeChange}
                />
              </div>
            ) : (
              <IssueExcelTable
                resolutionControls={resolutionFilterControls}
                issues={workspace.issues}
                fullscreenIssues={workspace.fullscreenIssues}
                fullscreenIssuesError={workspace.fullscreenIssuesError}
                isFullscreenIssuesLoading={workspace.isLoadingFullscreenIssues}
                modules={workspace.modules}
                issueClasses={workspace.issueClasses}
                members={workspace.members}
                selectedModuleFilters={workspace.selectedModuleFilters}
                canEdit={workspace.canEditProject}
                actionPending={workspace.areIssueActionsPending}
                onRowClick={workspace.canEditProject ? workspace.openEditIssueDialog : undefined}
                onEdit={workspace.openEditIssueDialog}
                onDelete={workspace.setIssueToDelete}
                onCreateInlineIssue={workspace.handleCreateInlineIssue}
                onUpdateInlineIssue={workspace.handleUpdateInlineIssue}
                onModuleFilterToggle={workspace.handleModuleFilterToggle}
                onClearModuleFilters={workspace.handleClearModuleFilters}
                sorting={workspace.sorting}
                onSortingChange={workspace.handleSortingChange}
                pageIndex={workspace.currentPageIndex}
                pageSize={workspace.pageSize}
                pageCount={workspace.pagination.totalPages}
                onPageIndexChange={workspace.setPageIndex}
                onPageSizeChange={workspace.handlePageSizeChange}
                onLoadFullscreenIssues={workspace.handleLoadFullscreenIssues}
                fullscreenReloadKey={workspace.fullscreenWorkbookReloadKey}
                fullscreenFilters={
                  <IssueFilters
                    variant="toolbar"
                    className="justify-end"
                    searchValue={workspace.searchValue}
                    onSearchChange={workspace.handleSearchChange}
                    issueTypeFilterOptions={workspace.issueTypeFilterOptions}
                    selectedIssueTypeFilters={workspace.selectedIssueTypeFilters}
                    onIssueTypeFilterToggle={workspace.handleIssueTypeFilterToggle}
                    onClearIssueTypeFilters={workspace.handleClearIssueTypeFilters}
                    priorityFilterOptions={workspace.priorityFilterOptions}
                    selectedPriorityFilters={workspace.selectedPriorityFilters}
                    onPriorityFilterToggle={workspace.handlePriorityFilterToggle}
                    onClearPriorityFilters={workspace.handleClearPriorityFilters}
                    assigneeFilterOptions={workspace.assigneeFilterOptions}
                    selectedAssigneeFilters={workspace.selectedAssigneeFilters}
                    onAssigneeFilterToggle={workspace.handleAssigneeFilterToggle}
                    onClearAssigneeFilters={workspace.handleClearAssigneeFilters}
                    showIssueCount={false}
                    resolutionFilter={workspace.resolutionFilter}
                    onResolutionFilterChange={workspace.handleResolutionFilterChange}
                    totalIssues={workspace.totalIssues}
                    openIssueCount={workspace.openIssueCount}
                    resolvedIssueCount={workspace.resolvedIssueCount}
                    pendingTestIssueCount={workspace.pendingTestIssueCount}
                    reopenedIssueCount={workspace.reopenedIssueCount}
                    activeFilterChips={workspace.activeFilterChips}
                    hasActiveFilters={workspace.hasActiveFilters}
                    onClearFilters={workspace.handleClearFilters}
                    visibleIssueCount={workspace.pagination.totalItems}
                    isUpdating={workspace.isRefreshing}
                    isSearchPending={workspace.isSearchPending}
                  />
                }
              />
            )}
          </section>
        </div>

        <aside
          className={
            workspace.isModuleSidebarCollapsed
              ? "transition-[width] duration-200 xl:w-19 xl:self-stretch"
              : "transition-[width] duration-200 xl:w-[18rem] xl:self-stretch"
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
      </div>

      <ProjectModuleDialog
        open={workspace.isModuleOpen}
        onOpenChange={workspace.closeModuleDialog}
        name={workspace.moduleName}
        description={workspace.moduleDescription}
        parentModuleId={workspace.moduleParentId}
        mainModules={workspace.mainModules}
        createSubModulesWithMain={workspace.createSubModulesWithMain}
        subModuleDrafts={workspace.subModuleDrafts}
        pending={workspace.isCreatingModule}
        onNameChange={workspace.setModuleName}
        onDescriptionChange={workspace.setModuleDescription}
        onParentModuleIdChange={workspace.setModuleParentId}
        onCreateSubModulesWithMainChange={workspace.setCreateSubModulesWithMain}
        onAddSubModuleDraft={workspace.addSubModuleDraft}
        onUpdateSubModuleDraft={workspace.updateSubModuleDraft}
        onRemoveSubModuleDraft={workspace.removeSubModuleDraft}
        onSubmit={workspace.handleCreateModule}
      />

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
        submitLabel={
          workspace.isReopeningIssue
            ? "Reopen issue"
            : workspace.isEditingIssue
              ? "Save changes"
              : "Create issue"
        }
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
