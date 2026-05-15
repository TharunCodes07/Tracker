import { NextResponse } from "next/server";

import {
  deleteOrganization,
  getOrganizationDetails,
  updateOrganization,
  type UpdateOrganizationInput,
} from "@/routes/admin/accounts";
import { handleRouteError, readJsonBody, requireRouteUser } from "@/routes/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ organizationId: string }> }
) {
  try {
    await requireRouteUser(request, { roles: ["SUPER_ADMIN"] });
    const { organizationId } = await context.params;
    const organization = await getOrganizationDetails(organizationId);

    return NextResponse.json({ organization });
  } catch (error) {
    return handleRouteError(error, "Unable to load organization.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ organizationId: string }> }
) {
  try {
    await requireRouteUser(request, { roles: ["SUPER_ADMIN"] });
    const { organizationId } = await context.params;
    const body = await readJsonBody<UpdateOrganizationInput>(request);
    const organization = await updateOrganization(organizationId, body);

    return NextResponse.json({
      organization,
      message: `${organization.name} was updated.`,
    });
  } catch (error) {
    return handleRouteError(error, "Unable to update organization.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ organizationId: string }> }
) {
  try {
    await requireRouteUser(request, { roles: ["SUPER_ADMIN"] });
    const { organizationId } = await context.params;
    const result = await deleteOrganization(organizationId);

    return NextResponse.json({
      ...result,
      message: `${result.name} was deleted.`,
    });
  } catch (error) {
    return handleRouteError(error, "Unable to delete organization.");
  }
}
