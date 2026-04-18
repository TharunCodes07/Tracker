import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { redirectIfAuthenticated } from "@/lib/auth-session";

export const metadata: Metadata = {
  title: "Login | Tracker",
  description: "Sign in to your Tracker workspace.",
};

export default async function LoginPage() {
  await redirectIfAuthenticated("/dashboard");

  return <AuthForm mode="login" />;
}
