import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, requireRouteUser } from "@/routes/http";
import { listNotificationsForUser } from "@/routes/notifications/queries";
import type { NotificationsResponse } from "@/routes/notifications/types";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 30;

function parseLimit(value: string | null) {
  if (!value) {
    return DEFAULT_LIMIT;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsedValue, MAX_LIMIT);
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireRouteUser(request);
    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
    const notificationCenter = await listNotificationsForUser(actor.id, limit);

    return NextResponse.json<NotificationsResponse>(notificationCenter);
  } catch (error) {
    return handleRouteError(
      error,
      "Something went wrong while loading notifications."
    );
  }
}
