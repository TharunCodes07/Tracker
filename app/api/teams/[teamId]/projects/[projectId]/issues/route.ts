import { after, NextRequest, NextResponse } from "next/server";

import { handleRouteError, readJsonBody, requireRouteUser } from "@/routes/http";
import { readListProjectIssuesInput } from "@/routes/issues/http";
import { createIssue } from "@/routes/issues/mutations";
import { listProjectIssuesForUser } from "@/routes/issues/queries";
import { dispatchNotificationEvents } from "@/routes/notifications/service";
import type { NotificationEvent } from "@/routes/notifications/types";
import type {
  CreateIssueInput,
  IssueMutationResponse,
  ProjectIssuesListResponse,
} from "@/routes/issues/types";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string; projectId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId, projectId } = await context.params;
    const listInput = readListProjectIssuesInput(request);
    const projectIssues = await listProjectIssuesForUser(actor.id, teamId, projectId, listInput);

    if (!projectIssues) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }

    return NextResponse.json<ProjectIssuesListResponse>(projectIssues);
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the issue request.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId, projectId } = await context.params;
    const body = await readJsonBody<CreateIssueInput>(request);
    const issue = await createIssue(actor, teamId, projectId, body);
    const notificationEvents: NotificationEvent[] = [
      {
        type: "issue.created",
        actorId: actor.id,
        actorName: actor.name ?? "",
        teamId,
        projectId,
        issueId: issue.id,
        issueNo: issue.no,
        issueTitle: issue.title,
        assignedTo: issue.assignedTo,
      },
    ];

    if (issue.assignedTo) {
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

    after(() => dispatchNotificationEvents(notificationEvents));

    return NextResponse.json<IssueMutationResponse>(
      {
        issue,
        message: `${issue.title} has been created.`,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the issue request.");
  }
}
