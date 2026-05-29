import { after, NextResponse } from "next/server";

import { withOrganizationScope } from "@/db";
import { handleRouteError, readJsonBody, withRouteOrganization } from "@/routes/http";
import { deleteIssue, updateIssue, updateIssueStatus } from "@/routes/issues/mutations";
import { getProjectIssueForUser } from "@/routes/issues/queries";
import { dispatchNotificationEvents } from "@/routes/notifications/service";
import type { NotificationEvent } from "@/routes/notifications/types";
import type {
  IssueDeleteResponse,
  IssueMutationResponse,
  UpdateIssueInput,
} from "@/routes/issues/types";

export async function GET(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string; issueId: string }> }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { teamId, projectId, issueId } = await context.params;
      const issue = await getProjectIssueForUser(actor.id, teamId, projectId, issueId);

      if (!issue) {
        return NextResponse.json({ message: "Issue not found." }, { status: 404 });
      }

      return NextResponse.json<IssueMutationResponse>({
        issue,
        message: `${issue.key} loaded.`,
      });
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the issue request.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string; issueId: string }> }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { teamId, projectId, issueId } = await context.params;
      const body = await readJsonBody<UpdateIssueInput>(request);
      const { issue, previousAssignedTo, previousTesterAssignedTo, previousStatus, reopened } =
        body.title && body.issueType && body.priority
          ? await updateIssue(actor, teamId, projectId, issueId, body)
          : await updateIssueStatus(actor, teamId, projectId, issueId, body.status);
      const notificationEvents: NotificationEvent[] = [];

      if (issue.assigneeId && issue.assigneeId !== previousAssignedTo) {
        notificationEvents.push({
          type: "issue.assigned",
          actorId: actor.id,
          actorName: actor.name ?? "",
          teamId,
          projectId,
          issueId: issue.id,
          issueNo: issue.no,
          issueTitle: issue.title,
          assigneeId: issue.assigneeId,
        });
      }

      if (issue.testerAssigneeId && issue.testerAssigneeId !== previousTesterAssignedTo) {
        notificationEvents.push({
          type: "issue.assigned",
          actorId: actor.id,
          actorName: actor.name ?? "",
          teamId,
          projectId,
          issueId: issue.id,
          issueNo: issue.no,
          issueTitle: issue.title,
          assigneeId: issue.testerAssigneeId,
        });
      }

      if (previousStatus !== "review" && issue.status === "review") {
        notificationEvents.push({
          type: "issue.marked_for_review",
          actorId: actor.id,
          actorName: actor.name ?? "",
          teamId,
          projectId,
          issueId: issue.id,
          issueNo: issue.no,
          issueTitle: issue.title,
          reviewerId: issue.testedById,
        });
      }

      if (reopened) {
        notificationEvents.push({
          type: "issue.reopened",
          actorId: actor.id,
          actorName: actor.name ?? "",
          teamId,
          projectId,
          issueId: issue.id,
          issueNo: issue.no,
          issueTitle: issue.title,
          assigneeId: issue.assigneeId,
        });
      }

      if (notificationEvents.length > 0 && actor.organizationId) {
        after(() => withOrganizationScope(actor.organizationId!, () => dispatchNotificationEvents(notificationEvents)));
      }

      return NextResponse.json<IssueMutationResponse>({
        issue,
        message: reopened ? `${issue.title} has been reopened.` : `${issue.title} has been updated.`,
      });
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
    return await withRouteOrganization(request, async (actor) => {
      const { teamId, projectId, issueId } = await context.params;
      const deletedIssue = await deleteIssue(actor, teamId, projectId, issueId);

      return NextResponse.json<IssueDeleteResponse>({
        deletedIssueId: deletedIssue.id,
        message: `${deletedIssue.title} has been removed.`,
      });
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the issue request.");
  }
}
