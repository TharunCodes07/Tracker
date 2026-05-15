import { NextResponse } from "next/server";

import {
  createManagedUser,
  listAdminUsers,
  listOrganizations,
  type CreateUserInput,
} from "@/routes/admin/accounts";
import { handleRouteError, readJsonBody, requireRouteUser } from "@/routes/http";

export async function GET(request: Request) {
  try {
    const actor = await requireRouteUser(request, { roles: ["SUPER_ADMIN", "ADMIN"] });
    const [users, organizations] = await Promise.all([
      listAdminUsers(actor),
      actor.role === "SUPER_ADMIN" ? listOrganizations() : Promise.resolve([]),
    ]);

    return NextResponse.json({ users, organizations });
  } catch (error) {
    return handleRouteError(error, "Unable to load users.");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRouteUser(request, { roles: ["SUPER_ADMIN", "ADMIN"] });
    const body = await readJsonBody<CreateUserInput>(request);
    const result = await createManagedUser(actor, body);

    return NextResponse.json(
      {
        ...result,
        message: `${result.roleLabel} account created.`,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, "Unable to create user.");
  }
}
