import { NextResponse } from "next/server";

import { withOrganizationScope } from "@/db";
import { auth } from "@/lib/auth";
import {
  getOrganizationId,
  hasRole,
  isActiveUser,
  type AppRole,
  type AppSessionUser,
} from "@/lib/rbac";

import { RouteError } from "./errors";

export interface RouteErrorResponse {
  message: string;
}

export type RouteUser = AppSessionUser & {
  id: string;
  email: string;
  name: string;
};

interface RequireRouteUserOptions {
  roles?: AppRole[];
  organizationRequired?: boolean;
  allowPasswordChangeRequired?: boolean;
}

export async function requireRouteUser(
  request: Request,
  options: RequireRouteUserOptions = {}
): Promise<RouteUser> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    throw new RouteError("Unauthorized.", 401);
  }

  const user = session.user as RouteUser;

  if (!isActiveUser(user)) {
    throw new RouteError("Your account is inactive.", 403);
  }

  if (user.mustChangePassword && !options.allowPasswordChangeRequired) {
    throw new RouteError("Password change required before continuing.", 403);
  }

  if (options.roles && !hasRole(user, options.roles)) {
    throw new RouteError("You do not have permission to access this resource.", 403);
  }

  if (options.organizationRequired && !getOrganizationId(user)) {
    throw new RouteError("No organization is assigned to this account.", 403);
  }

  return user;
}

export async function withRouteOrganization<T>(
  request: Request,
  callback: (actor: RouteUser) => Promise<T>
) {
  const actor = await requireRouteUser(request, {
    organizationRequired: true,
    roles: ["ADMIN", "USER"],
  });
  const organizationId = getOrganizationId(actor);

  if (!organizationId) {
    throw new RouteError("No organization is assigned to this account.", 403);
  }

  return withOrganizationScope(organizationId, () => callback(actor));
}

export async function readJsonBody<T>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    throw new RouteError("Invalid request body.");
  }
}

export function handleRouteError(
  error: unknown,
  fallbackMessage = "Something went wrong while handling the request."
) {
  if (error instanceof RouteError) {
    return NextResponse.json<RouteErrorResponse>(
      { message: error.message },
      { status: error.status }
    );
  }

  console.error(error);

  return NextResponse.json<RouteErrorResponse>(
    { message: fallbackMessage },
    { status: 500 }
  );
}
