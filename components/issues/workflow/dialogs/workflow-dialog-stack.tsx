import type { FormEvent } from "react";

import type {
  IssueListItem,
  ProjectComponentListItem,
  ProjectIssuesWorkspaceResponse,
} from "@/routes/issues/types";

import type {
  ComponentFormState,
  EpicFormState,
  IssueFormState,
  ModuleFormState,
  ReleaseFormState,
  SprintFormState,
} from "../types";
import { DeleteIssueDialog } from "./delete-issue-dialog";
import {
  ComponentDialog,
  EpicDialog,
  ModuleDialog,
  ReleaseDialog,
  SprintDialog,
} from "./entity-dialogs";
import { IssueEditorDialog } from "./issue-editor-dialog";
import { IssueSheet } from "./issue-sheet";

export function WorkflowDialogStack({
  selectedIssue,
  canEdit,
  isIssueSheetOpen,
  isIssueDialogOpen,
  isSavingIssue,
  issueForm,
  workspace,
  issues,
  editingIssue,
  componentsForForm,
  currentUserId,
  isModuleDialogOpen,
  isSavingModule,
  moduleForm,
  isComponentDialogOpen,
  isSavingComponent,
  componentForm,
  isEpicDialogOpen,
  isSavingEpic,
  epicForm,
  isReleaseDialogOpen,
  isSavingRelease,
  releaseForm,
  isSprintDialogOpen,
  isSavingSprint,
  sprintForm,
  issueToDelete,
  isDeletingIssue,
  onIssueSheetOpenChange,
  onEditIssue,
  onIssueDialogOpenChange,
  onIssueFormChange,
  onIssueSubmit,
  onModuleDialogOpenChange,
  onModuleFormChange,
  onModuleSubmit,
  onComponentDialogOpenChange,
  onComponentFormChange,
  onComponentSubmit,
  onEpicDialogOpenChange,
  onEpicFormChange,
  onEpicSubmit,
  onReleaseDialogOpenChange,
  onReleaseFormChange,
  onReleaseSubmit,
  onSprintDialogOpenChange,
  onSprintFormChange,
  onSprintSubmit,
  onDeleteDialogOpenChange,
  onDeleteIssue,
  onDeleteIssueRequest,
  onRemoveIssueMedia,
}: {
  selectedIssue: IssueListItem | null;
  canEdit: boolean;
  isIssueSheetOpen: boolean;
  isIssueDialogOpen: boolean;
  isSavingIssue: boolean;
  issueForm: IssueFormState;
  workspace: ProjectIssuesWorkspaceResponse;
  issues: IssueListItem[];
  editingIssue: IssueListItem | null;
  componentsForForm: ProjectComponentListItem[];
  currentUserId: string | null;
  isModuleDialogOpen: boolean;
  isSavingModule: boolean;
  moduleForm: ModuleFormState;
  isComponentDialogOpen: boolean;
  isSavingComponent: boolean;
  componentForm: ComponentFormState;
  isEpicDialogOpen: boolean;
  isSavingEpic: boolean;
  epicForm: EpicFormState;
  isReleaseDialogOpen: boolean;
  isSavingRelease: boolean;
  releaseForm: ReleaseFormState;
  isSprintDialogOpen: boolean;
  isSavingSprint: boolean;
  sprintForm: SprintFormState;
  issueToDelete: IssueListItem | null;
  isDeletingIssue: boolean;
  onIssueSheetOpenChange: (open: boolean) => void;
  onEditIssue: (issue: IssueListItem) => void;
  onIssueDialogOpenChange: (open: boolean) => void;
  onIssueFormChange: (form: IssueFormState) => void;
  onIssueSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onModuleDialogOpenChange: (open: boolean) => void;
  onModuleFormChange: (form: ModuleFormState) => void;
  onModuleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onComponentDialogOpenChange: (open: boolean) => void;
  onComponentFormChange: (form: ComponentFormState) => void;
  onComponentSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEpicDialogOpenChange: (open: boolean) => void;
  onEpicFormChange: (form: EpicFormState) => void;
  onEpicSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReleaseDialogOpenChange: (open: boolean) => void;
  onReleaseFormChange: (form: ReleaseFormState) => void;
  onReleaseSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSprintDialogOpenChange: (open: boolean) => void;
  onSprintFormChange: (form: SprintFormState) => void;
  onSprintSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onDeleteIssue: () => void;
  onDeleteIssueRequest: (issue: IssueListItem) => void;
  onRemoveIssueMedia: (issue: IssueListItem, mediaId: string) => void;
}) {
  return (
    <>
      <IssueSheet
        open={isIssueSheetOpen}
        selectedIssue={selectedIssue}
        canEdit={canEdit}
        mediaActionPending={isSavingIssue}
        onOpenChange={onIssueSheetOpenChange}
        onEditIssue={onEditIssue}
        onDeleteIssue={onDeleteIssueRequest}
        onRemoveMedia={onRemoveIssueMedia}
      />

      <IssueEditorDialog
        open={isIssueDialogOpen}
        pending={isSavingIssue}
        form={issueForm}
        workspace={workspace}
        issues={issues}
        editingIssue={editingIssue}
        componentsForForm={componentsForForm}
        currentUserId={currentUserId}
        onOpenChange={onIssueDialogOpenChange}
        onChange={onIssueFormChange}
        onSubmit={onIssueSubmit}
      />

      <ModuleDialog
        open={isModuleDialogOpen}
        pending={isSavingModule}
        form={moduleForm}
        onOpenChange={onModuleDialogOpenChange}
        onChange={onModuleFormChange}
        onSubmit={onModuleSubmit}
      />
      <ComponentDialog
        open={isComponentDialogOpen}
        pending={isSavingComponent}
        modules={workspace.modules}
        form={componentForm}
        onOpenChange={onComponentDialogOpenChange}
        onChange={onComponentFormChange}
        onSubmit={onComponentSubmit}
      />
      <EpicDialog
        open={isEpicDialogOpen}
        pending={isSavingEpic}
        form={epicForm}
        onOpenChange={onEpicDialogOpenChange}
        onChange={onEpicFormChange}
        onSubmit={onEpicSubmit}
      />
      <ReleaseDialog
        open={isReleaseDialogOpen}
        pending={isSavingRelease}
        form={releaseForm}
        onOpenChange={onReleaseDialogOpenChange}
        onChange={onReleaseFormChange}
        onSubmit={onReleaseSubmit}
      />
      <SprintDialog
        open={isSprintDialogOpen}
        pending={isSavingSprint}
        form={sprintForm}
        onOpenChange={onSprintDialogOpenChange}
        onChange={onSprintFormChange}
        onSubmit={onSprintSubmit}
      />

      <DeleteIssueDialog
        issue={issueToDelete}
        pending={isDeletingIssue}
        onOpenChange={onDeleteDialogOpenChange}
        onDelete={onDeleteIssue}
      />
    </>
  );
}
