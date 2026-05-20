import { useState, useTransition, type FormEvent } from "react";

import { toast } from "sonner";

import type {
  ProjectComponentMutationResponse,
  ProjectEpicMutationResponse,
  ProjectModuleMutationResponse,
  ProjectReleaseMutationResponse,
  ProjectSprintMutationResponse,
} from "@/routes/issues/types";

import {
  createEmptyComponentForm,
  createEmptyEpicForm,
  createEmptyModuleForm,
  createEmptyReleaseForm,
  createEmptySprintForm,
  idOrNull,
  valueOrNull,
} from "./forms";
import { requestJson } from "./http";
import type {
  ComponentFormState,
  EpicFormState,
  ModuleFormState,
  ReleaseFormState,
  SprintFormState,
} from "./types";

export function useWorkflowEntityDialogs({
  teamId,
  projectId,
  onRefresh,
}: {
  teamId: string | undefined;
  projectId: string | undefined;
  onRefresh: () => void;
}) {
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [moduleForm, setModuleForm] = useState<ModuleFormState>(createEmptyModuleForm);
  const [isSavingModule, startModuleTransition] = useTransition();

  const [isComponentDialogOpen, setIsComponentDialogOpen] = useState(false);
  const [componentForm, setComponentForm] = useState<ComponentFormState>(createEmptyComponentForm);
  const [isSavingComponent, startComponentTransition] = useTransition();

  const [isEpicDialogOpen, setIsEpicDialogOpen] = useState(false);
  const [epicForm, setEpicForm] = useState<EpicFormState>(createEmptyEpicForm);
  const [isSavingEpic, startEpicTransition] = useTransition();

  const [isReleaseDialogOpen, setIsReleaseDialogOpen] = useState(false);
  const [releaseForm, setReleaseForm] = useState<ReleaseFormState>(createEmptyReleaseForm);
  const [isSavingRelease, startReleaseTransition] = useTransition();

  const [isSprintDialogOpen, setIsSprintDialogOpen] = useState(false);
  const [sprintForm, setSprintForm] = useState<SprintFormState>(createEmptySprintForm);
  const [isSavingSprint, startSprintTransition] = useTransition();

  function openComponentDialog(moduleId?: string) {
    setComponentForm(createEmptyComponentForm(moduleId));
    setIsComponentDialogOpen(true);
  }

  function handleModuleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teamId || !projectId) return;

    startModuleTransition(async () => {
      try {
        const data = await requestJson<ProjectModuleMutationResponse>(
          `/api/teams/${teamId}/projects/${projectId}/modules`,
          {
            method: "POST",
            body: JSON.stringify({
              name: moduleForm.name,
              description: valueOrNull(moduleForm.description),
            }),
          }
        );

        setModuleForm(createEmptyModuleForm());
        setIsModuleDialogOpen(false);
        setComponentForm(createEmptyComponentForm(data.module.id));
        onRefresh();
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create the module.");
      }
    });
  }

  function handleComponentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teamId || !projectId) return;

    startComponentTransition(async () => {
      try {
        const data = await requestJson<ProjectComponentMutationResponse>(
          `/api/teams/${teamId}/projects/${projectId}/components`,
          {
            method: "POST",
            body: JSON.stringify({
              moduleId: idOrNull(componentForm.moduleId),
              name: componentForm.name,
              description: valueOrNull(componentForm.description),
            }),
          }
        );

        setComponentForm(createEmptyComponentForm());
        setIsComponentDialogOpen(false);
        onRefresh();
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create the component.");
      }
    });
  }

  function handleEpicSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teamId || !projectId) return;

    startEpicTransition(async () => {
      try {
        const data = await requestJson<ProjectEpicMutationResponse>(
          `/api/teams/${teamId}/projects/${projectId}/epics`,
          {
            method: "POST",
            body: JSON.stringify({
              title: epicForm.title,
              description: valueOrNull(epicForm.description),
              status: epicForm.status,
            }),
          }
        );

        setEpicForm(createEmptyEpicForm());
        setIsEpicDialogOpen(false);
        onRefresh();
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create the epic.");
      }
    });
  }

  function handleReleaseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teamId || !projectId) return;

    startReleaseTransition(async () => {
      try {
        const data = await requestJson<ProjectReleaseMutationResponse>(
          `/api/teams/${teamId}/projects/${projectId}/releases`,
          {
            method: "POST",
            body: JSON.stringify({
              name: releaseForm.name,
              description: valueOrNull(releaseForm.description),
              status: releaseForm.status,
            }),
          }
        );

        setReleaseForm(createEmptyReleaseForm());
        setIsReleaseDialogOpen(false);
        onRefresh();
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create the release.");
      }
    });
  }

  function handleSprintSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teamId || !projectId) return;

    startSprintTransition(async () => {
      try {
        const data = await requestJson<ProjectSprintMutationResponse>(
          `/api/teams/${teamId}/projects/${projectId}/sprints`,
          {
            method: "POST",
            body: JSON.stringify({
              name: sprintForm.name,
              goal: valueOrNull(sprintForm.goal),
              status: sprintForm.status,
              startDate: valueOrNull(sprintForm.startDate),
              endDate: valueOrNull(sprintForm.endDate),
            }),
          }
        );

        setSprintForm(createEmptySprintForm());
        setIsSprintDialogOpen(false);
        onRefresh();
        toast.success(data.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create the sprint.");
      }
    });
  }

  return {
    isModuleDialogOpen,
    setIsModuleDialogOpen,
    moduleForm,
    setModuleForm,
    isSavingModule,
    isComponentDialogOpen,
    setIsComponentDialogOpen,
    componentForm,
    setComponentForm,
    openComponentDialog,
    isSavingComponent,
    isEpicDialogOpen,
    setIsEpicDialogOpen,
    epicForm,
    setEpicForm,
    isSavingEpic,
    isReleaseDialogOpen,
    setIsReleaseDialogOpen,
    releaseForm,
    setReleaseForm,
    isSavingRelease,
    isSprintDialogOpen,
    setIsSprintDialogOpen,
    sprintForm,
    setSprintForm,
    isSavingSprint,
    handleModuleSubmit,
    handleComponentSubmit,
    handleEpicSubmit,
    handleReleaseSubmit,
    handleSprintSubmit,
  };
}
