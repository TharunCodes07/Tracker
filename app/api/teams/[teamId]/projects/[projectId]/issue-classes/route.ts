import { NextResponse } from "next/server";

import { handleRouteError, readJsonBody, requireRouteUser } from "@/routes/http";
import { createIssueClass } from "@/routes/issues/mutations";
import type {
  CreateIssueClassInput,
  IssueClassMutationResponse,
} from "@/routes/issues/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string; projectId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId, projectId } = await context.params;
    const body = await readJsonBody<CreateIssueClassInput>(request);
    const issueClass = await createIssueClass(actor, teamId, projectId, body);

    return NextResponse.json<IssueClassMutationResponse>(
      {
        issueClass,
        message: `${issueClass.name} can now be used on issues.`,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return handleRouteError(
      error,
      "Something went wrong while handling the issue class request."
    );
  }
}
