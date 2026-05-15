import { NextResponse } from "next/server";

import { handleRouteError, withRouteOrganization } from "@/routes/http";
import { markNotificationAsReadForUser } from "@/routes/notifications/mutations";
import type { NotificationMutationResponse } from "@/routes/notifications/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ notificationId: string }> }
) {
  try {
    return await withRouteOrganization(request, async (actor) => {
      const { notificationId } = await context.params;
      const notification = await markNotificationAsReadForUser(actor.id, notificationId);

      return NextResponse.json<NotificationMutationResponse>({
        notification,
        message: "Notification marked as read.",
      });
    });
  } catch (error) {
    return handleRouteError(
      error,
      "Something went wrong while updating the notification."
    );
  }
}
