import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

import { RouteError } from "./errors";

export interface RouteErrorResponse {
  message: string;
}

export async function requireRouteUser(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    throw new RouteError("Unauthorized.", 401);
  }

  return session.user;
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
