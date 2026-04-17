import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Login | Tracker",
  description: "Sign in to your Tracker workspace.",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
