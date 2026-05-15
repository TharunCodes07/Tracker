import type { Metadata } from "next";

import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { requireServerSession } from "@/lib/auth-session";

export const metadata: Metadata = {
  title: "Change Password | Tracker",
  description: "Set a private password for your Tracker account.",
};

export default async function ChangePasswordPage() {
  await requireServerSession({
    allowPasswordChangeRequired: true,
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/35 px-4 py-10">
      <ChangePasswordForm />
    </main>
  );
}
