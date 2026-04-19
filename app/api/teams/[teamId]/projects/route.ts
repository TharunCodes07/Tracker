import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, readJsonBody, requireRouteUser } from "@/routes/http";
import { createProjectForTeam } from "@/routes/projects/mutations";
import { PROJECT_LIST_SORT_FIELDS } from "@/routes/projects/types";
import type {
  CreateProjectInput,
  ListTeamProjectsInput,
  ProjectListSortDirection,
  ProjectListSortField,
  ProjectMutationResponse,
  TeamProjectsResponse,
} from "@/routes/projects/types";
import { getTeamProjectsForUser } from "@/routes/projects/queries";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 120;

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function parseSortBy(value: string | null): ProjectListSortField {
  if (!value) {
    return "createdAt";
  }

  return (PROJECT_LIST_SORT_FIELDS as readonly string[]).includes(value)
    ? (value as ProjectListSortField)
    : "createdAt";
}

function parseSortDirection(value: string | null): ProjectListSortDirection {
  return value === "asc" ? "asc" : "desc";
}

function readListTeamProjectsInput(request: NextRequest): ListTeamProjectsInput {
  const { searchParams } = request.nextUrl;

  return {
    page: parsePositiveInteger(searchParams.get("page"), DEFAULT_PAGE),
    pageSize: Math.min(
      parsePositiveInteger(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    ),
    search: searchParams.get("search")?.trim().slice(0, MAX_SEARCH_LENGTH) ?? "",
    sortBy: parseSortBy(searchParams.get("sortBy")),
    sortDirection: parseSortDirection(searchParams.get("sortDirection")),
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId } = await context.params;
    const listInput = readListTeamProjectsInput(request);
    const teamProjects = await getTeamProjectsForUser(actor.id, teamId, listInput);

    if (!teamProjects) {
      return NextResponse.json({ message: "Team not found." }, { status: 404 });
    }

    return NextResponse.json<TeamProjectsResponse>(teamProjects);
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the project request.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const actor = await requireRouteUser(request);
    const { teamId } = await context.params;
    const body = await readJsonBody<CreateProjectInput>(request);
    const project = await createProjectForTeam(actor, teamId, body);

    return NextResponse.json<ProjectMutationResponse>(
      {
        project,
        message: `${project.name} is ready.`,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the project request.");
  }
}
