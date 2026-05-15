import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, withRouteOrganization } from "@/routes/http";
import { listNotificationsForUser } from "@/routes/notifications/queries";
import type { NotificationsResponse } from "@/routes/notifications/types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

function parsePageSize(searchParams: URLSearchParams) {
  const pageSize = parsePositiveInteger(
    searchParams.get("pageSize") ?? searchParams.get("limit"),
    DEFAULT_LIMIT
  );

  return Math.min(pageSize, MAX_LIMIT);
}

function parseUnreadOnly(value: string | null) {
  return value === "true" || value === "1";
}

export async function GET(request: NextRequest) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const notificationCenter = await listNotificationsForUser(actor.id, {
        page: parsePositiveInteger(request.nextUrl.searchParams.get("page"), DEFAULT_PAGE),
        pageSize: parsePageSize(request.nextUrl.searchParams),
        unreadOnly: parseUnreadOnly(request.nextUrl.searchParams.get("unreadOnly")),
      });

      return NextResponse.json<NotificationsResponse>(notificationCenter);
    });
  } catch (error) {
    return handleRouteError(
      error,
      "Something went wrong while loading notifications."
    );
  }
}
