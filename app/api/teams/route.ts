import { NextRequest, NextResponse } from "next/server";

import { TEAM_LIST_SORT_FIELDS } from "@/routes/teams/types";
import type {
  CreateTeamInput,
  ListTeamsInput,
  TeamListSortDirection,
  TeamListSortField,
  TeamMutationResponse,
  TeamsListResponse,
} from "@/routes/teams/types";
import { handleRouteError, readJsonBody, withRouteOrganization } from "@/routes/http";
import { createTeamForUser } from "@/routes/teams/mutations";
import { listTeamsForUser } from "@/routes/teams/queries";

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

function parseSortBy(value: string | null): TeamListSortField {
  if (!value) {
    return "createdAt";
  }

  return (TEAM_LIST_SORT_FIELDS as readonly string[]).includes(value)
    ? (value as TeamListSortField)
    : "createdAt";
}

function parseSortDirection(value: string | null): TeamListSortDirection {
  return value === "asc" ? "asc" : "desc";
}

function readListTeamsInput(request: NextRequest): ListTeamsInput {
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

export async function GET(request: NextRequest) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const listInput = readListTeamsInput(request);
      const teams = await listTeamsForUser(actor.id, listInput);

      return NextResponse.json<TeamsListResponse>(teams);
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the team request.");
  }
}

export async function POST(request: Request) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const body = await readJsonBody<CreateTeamInput>(request);
      const team = await createTeamForUser(actor, body);

      return NextResponse.json<TeamMutationResponse>(
        {
          team,
          message: `${team.name} is ready.`,
        },
        {
          status: 201,
        }
      );
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the team request.");
  }
}
