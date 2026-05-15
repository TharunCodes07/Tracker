import { NextResponse } from "next/server";

import {
  createOrganizationWithAdmin,
  listOrganizations,
  type CreateOrganizationInput,
} from "@/routes/admin/accounts";
import { handleRouteError, readJsonBody, requireRouteUser } from "@/routes/http";

export async function GET(request: Request) {
  try {
    await requireRouteUser(request, { roles: ["SUPER_ADMIN"] });
    const organizations = await listOrganizations();

    return NextResponse.json({ organizations });
  } catch (error) {
    return handleRouteError(error, "Unable to load organizations.");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRouteUser(request, { roles: ["SUPER_ADMIN"] });
    const body = await readJsonBody<CreateOrganizationInput>(request);
    const result = await createOrganizationWithAdmin(body, actor.id);

    return NextResponse.json(
      {
        ...result,
        message: `${result.organization.name} is ready. A temporary admin was created.`,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, "Unable to create organization.");
  }
}
