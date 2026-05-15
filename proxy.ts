import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import {
  getOrganizationId,
  isActiveUser,
  normalizeRole,
  type AppSessionUser,
} from "@/lib/rbac";

const PUBLIC_PATHS = ["/", "/login", "/signup"];
const PASSWORD_CHANGE_PATHS = ["/change-password", "/api/account/change-password"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function redirect(pathname: string, request: NextRequest) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const isPublic = startsWithAny(pathname, PUBLIC_PATHS);
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return isPublic || pathname === "/change-password" ? NextResponse.next() : redirect("/login", request);
  }

  const user = session.user as AppSessionUser;

  if (!isActiveUser(user)) {
    return redirect("/login", request);
  }

  if (user.mustChangePassword && !startsWithAny(pathname, PASSWORD_CHANGE_PATHS)) {
    return redirect("/change-password", request);
  }

  if (isPublic && pathname !== "/change-password") {
    return redirect("/dashboard", request);
  }

  const role = normalizeRole(user.role);

  if (role === "SUPER_ADMIN") {
    if (
      !pathname.startsWith("/dashboard") &&
      !pathname.startsWith("/admin/organizations") &&
      !pathname.startsWith("/admin/users")
    ) {
      return redirect("/dashboard", request);
    }

    return NextResponse.next();
  }

  if (!getOrganizationId(user)) {
    return redirect("/login", request);
  }

  if (pathname.startsWith("/admin/organizations")) {
    return redirect("/dashboard", request);
  }

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return redirect("/dashboard", request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
