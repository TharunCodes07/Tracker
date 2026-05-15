import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrganizationDetails } from "@/components/admin/organization-details";
import { requireServerSession } from "@/lib/auth-session";
import { RouteError } from "@/routes/errors";
import { getOrganizationDetails } from "@/routes/admin/accounts";

export const metadata: Metadata = {
  title: "Organization Details | Tracker",
  description: "Review Tracker organization details.",
};

export default async function OrganizationDetailsPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  await requireServerSession({ roles: ["SUPER_ADMIN"] });
  const { organizationId } = await params;

  const organization = await getOrganizationDetails(organizationId).catch((error) => {
    if (error instanceof RouteError && error.status === 404) {
      notFound();
    }

    throw error;
  });

  return <OrganizationDetails initialOrganization={organization} />;
}
