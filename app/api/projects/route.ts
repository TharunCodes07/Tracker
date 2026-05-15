import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, withRouteOrganization } from "@/routes/http";
import { listProjectsForUser } from "@/routes/projects/queries";
import { USER_PROJECT_LIST_SORT_FIELDS } from "@/routes/projects/types";
import type {
  ListUserProjectsInput,
  UserProjectListSortDirection,
  UserProjectListSortField,
  UserProjectsResponse,
} from "@/routes/projects/types";

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

function parseSortBy(value: string | null): UserProjectListSortField {
  if (!value) {
    return "createdAt";
  }

  return (USER_PROJECT_LIST_SORT_FIELDS as readonly string[]).includes(value)
    ? (value as UserProjectListSortField)
    : "createdAt";
}

function parseSortDirection(value: string | null): UserProjectListSortDirection {
  return value === "asc" ? "asc" : "desc";
}

function readListProjectsInput(request: NextRequest): ListUserProjectsInput {
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
      const listInput = readListProjectsInput(request);
      const projects = await listProjectsForUser(actor.id, listInput);

      return NextResponse.json<UserProjectsResponse>(projects);
    });
  } catch (error) {
    return handleRouteError(error, "Something went wrong while handling the project request.");
  }
}
