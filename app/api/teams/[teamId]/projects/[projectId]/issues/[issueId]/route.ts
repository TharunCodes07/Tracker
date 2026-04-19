import { NextResponse } from "next/server";

import { handleRouteError, readJsonBody, requireRouteUser } from "@/routes/http";
import { deleteIssue, updateIssue } from "@/routes/issues/mutations";
import type {
  IssueDeleteResponse,
  IssueMutationResponse,
  UpdateIssueInput,
} from "@/routes/issues/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string; issueId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId, projectId, issueId } = await context.params;
    const body = await readJsonBody<UpdateIssueInput>(request);
    const issue = await updateIssue(actor, teamId, projectId, issueId, body);

    return NextResponse.json<IssueMutationResponse>({
      issue,
      message: `${issue.title} has been updated.`,
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the issue request.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string; issueId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId, projectId, issueId } = await context.params;
    const deletedIssue = await deleteIssue(actor, teamId, projectId, issueId);

    return NextResponse.json<IssueDeleteResponse>({
      deletedIssueId: deletedIssue.id,
      message: `${deletedIssue.title} has been removed.`,
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the issue request.");
  }
}
