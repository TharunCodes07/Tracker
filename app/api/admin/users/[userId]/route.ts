import { NextResponse } from "next/server";

import {
  deleteManagedUser,
  getAdminUserDetails,
  updateManagedUser,
  type UpdateUserInput,
} from "@/routes/admin/accounts";
import { handleRouteError, readJsonBody, requireRouteUser } from "@/routes/http";

export async function GET(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const actor = await requireRouteUser(request, { roles: ["SUPER_ADMIN", "ADMIN"] });
    const { userId } = await context.params;
    const user = await getAdminUserDetails(actor, userId);

    return NextResponse.json({ user });
  } catch (error) {
    return handleRouteError(error, "Unable to load user.");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const actor = await requireRouteUser(request, { roles: ["SUPER_ADMIN", "ADMIN"] });
    const { userId } = await context.params;
    const body = await readJsonBody<UpdateUserInput>(request);
    const user = await updateManagedUser(actor, userId, body);

    return NextResponse.json({
      user,
      message: `${user.name} was updated.`,
    });
  } catch (error) {
    return handleRouteError(error, "Unable to update user.");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const actor = await requireRouteUser(request, { roles: ["SUPER_ADMIN", "ADMIN"] });
    const { userId } = await context.params;
    const result = await deleteManagedUser(actor, userId);

    return NextResponse.json({
      ...result,
      message: `${result.name} was deleted.`,
    });
  } catch (error) {
    return handleRouteError(error, "Unable to delete user.");
  }
}
