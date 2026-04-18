import { NextResponse } from "next/server";

import { handleRouteError, readJsonBody, requireRouteUser } from "@/routes/http";
import {
  deleteProjectForTeam,
  updateProjectForTeam,
} from "@/routes/projects/mutations";
import type {
  ProjectDeleteResponse,
  ProjectMutationResponse,
  UpdateProjectInput,
} from "@/routes/projects/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId, projectId } = await context.params;
    const body = await readJsonBody<UpdateProjectInput>(request);
    const project = await updateProjectForTeam(actor, teamId, projectId, body);

    return NextResponse.json<ProjectMutationResponse>({
      project,
      message: `${project.name} has been updated.`,
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the project request.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId, projectId } = await context.params;
    const deletedProject = await deleteProjectForTeam(actor, teamId, projectId);

    return NextResponse.json<ProjectDeleteResponse>({
      deletedProjectId: deletedProject.id,
      message: `${deletedProject.name} has been removed.`,
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the project request.");
  }
}
