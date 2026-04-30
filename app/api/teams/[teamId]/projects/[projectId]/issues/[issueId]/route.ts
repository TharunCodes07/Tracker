import { after, NextResponse } from "next/server";

import { handleRouteError, readJsonBody, requireRouteUser } from "@/routes/http";
import { deleteIssue, updateIssue } from "@/routes/issues/mutations";
import { dispatchNotificationEvents } from "@/routes/notifications/service";
import type { NotificationEvent } from "@/routes/notifications/types";
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
    const { issue, previousAssignedTo, previousStatus } = await updateIssue(
      actor,
      teamId,
      projectId,
      issueId,
      body
    );
    const notificationEvents: NotificationEvent[] = [];

    if (issue.assignedTo && issue.assignedTo !== previousAssignedTo) {
      notificationEvents.push({
        type: "issue.assigned",
        actorId: actor.id,
        actorName: actor.name ?? "",
        teamId,
        projectId,
        issueId: issue.id,
        issueNo: issue.no,
        issueTitle: issue.title,
        assigneeId: issue.assignedTo,
      });
    }

    if (previousStatus !== "done" && issue.status === "done") {
      notificationEvents.push({
        type: "issue.ready_for_test",
        actorId: actor.id,
        actorName: actor.name ?? "",
        teamId,
        projectId,
        issueId: issue.id,
        issueNo: issue.no,
        issueTitle: issue.title,
      });
    }

    if (previousStatus === "done" && issue.status !== "done") {
      notificationEvents.push({
        type: "issue.reopened",
        actorId: actor.id,
        actorName: actor.name ?? "",
        teamId,
        projectId,
        issueId: issue.id,
        issueNo: issue.no,
        issueTitle: issue.title,
        assigneeId: issue.assignedTo,
      });
    }

    if (notificationEvents.length > 0) {
      after(() => dispatchNotificationEvents(notificationEvents));
    }

    return NextResponse.json<IssueMutationResponse>({
      issue,
      message:
        previousStatus === "done" && issue.status !== "done"
          ? `${issue.title} has been reopened.`
          : `${issue.title} has been updated.`,
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
