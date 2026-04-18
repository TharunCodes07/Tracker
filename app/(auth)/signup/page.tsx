import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { redirectIfAuthenticated } from "@/lib/auth-session";

export const metadata: Metadata = {
  title: "Sign Up | Tracker",
  description: "Create a Tracker account for your team workspace.",
};

export default async function SignupPage() {
  await redirectIfAuthenticated("/dashboard");

  return <AuthForm mode="signup" />;
}
